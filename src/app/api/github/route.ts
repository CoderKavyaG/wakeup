import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "coderkavyag";
    
    // Attempt to read token from header or env
    let token = request.headers.get("Authorization")?.replace("Bearer ", "").replace("token ", "") || process.env.GITHUB_TOKEN;
    
    // 1. Check cache first
    const cacheId = `github-cache-${username}`;
    const existingCache = await prisma.githubCache.findUnique({
      where: { id: cacheId },
    });

    if (existingCache) {
      const cacheAge = Date.now() - new Date(existingCache.updatedAt).getTime();
      // If we don't have a token, we HAVE to rely on cache
      if (cacheAge < CACHE_TTL_MS || !token) {
        return NextResponse.json(existingCache.data);
      }
    }

    if (!token) {
      return NextResponse.json({ error: "No GitHub token provided and no valid cache found." }, { status: 401 });
    }

    const headers: HeadersInit = {
      "Authorization": `bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
    };

    // 2. Fetch Repositories
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`, {
      headers,
      next: { revalidate: 60 }
    });
    
    if (!reposRes.ok) {
      if (existingCache) return NextResponse.json(existingCache.data);
      throw new Error(`GitHub API returned status ${reposRes.status}`);
    }

    const reposData = await reposRes.json();

    // 3. Process Repositories
    const processedRepos = (reposData as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || null,
      html_url: r.html_url,
      updated_at: r.pushed_at || r.updated_at,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks,
      language: r.language || null,
      open_issues_count: r.open_issues_count || 0
    }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeRepos = processedRepos.filter(r => new Date(r.updated_at) >= thirtyDaysAgo);
    const staleRepos = processedRepos.filter(r => new Date(r.updated_at) < thirtyDaysAgo);

    // Language Breakdown
    const langCounts: Record<string, number> = {};
    let totalLangs = 0;
    processedRepos.forEach(r => {
      if (r.language) {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
        totalLangs++;
      }
    });

    const languageBreakdown = Object.entries(langCounts).map(([lang, count]) => ({
      language: lang,
      count,
      percentage: totalLangs > 0 ? Math.round((count / totalLangs) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);

    // 4. GraphQL Query for Contributions Calendar
    const graphQuery = `
      query {
        user(login: "${username}") {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    const graphRes = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ query: graphQuery })
    });

    let currentStreak = 0;
    let totalContributions = 0;

    if (graphRes.ok) {
      const graphData = await graphRes.json();
      const calendar = graphData?.data?.user?.contributionsCollection?.contributionCalendar;
      if (calendar) {
        totalContributions = calendar.totalContributions || 0;
        
        // Flatten days
        const allDays = calendar.weeks.flatMap((w: any) => w.contributionDays);
        allDays.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const todayStr = new Date().toISOString().split("T")[0];
        const yesterdayStr = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0];

        // Find today or yesterday to start streak logic
        const startDayIndex = allDays.findIndex((d: any) => d.date === todayStr || d.date === yesterdayStr);
        
        if (startDayIndex !== -1) {
          // If the most recent valid day (today or yesterday) has 0 contributions, and it's yesterday, streak is 0.
          // If it's today with 0, we should check yesterday.
          let startIndex = startDayIndex;
          if (allDays[startIndex].date === todayStr && allDays[startIndex].contributionCount === 0) {
            startIndex = startIndex + 1; // Check yesterday
          }

          if (allDays[startIndex] && allDays[startIndex].contributionCount > 0) {
            // Count backwards
            for (let i = startIndex; i < allDays.length; i++) {
              if (allDays[i].contributionCount > 0) {
                currentStreak++;
              } else {
                break;
              }
            }
          }
        }
      }
    }

    // 5. Fetch Parallel Commits for active repos (Cap to 20 to avoid rate limits)
    const commitPromises = activeRepos.slice(0, 20).map(async (repo) => {
      try {
        const cRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=1`, {
          headers
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData && cData.length > 0) {
            const c = cData[0];
            return {
              sha: c.sha.substring(0, 7),
              repoName: repo.name,
              message: c.commit.message,
              date: c.commit.committer.date,
              url: c.html_url
            };
          }
        }
      } catch (e) {
        // ignore individual repo failure
      }
      return null;
    });

    const commitResults = await Promise.all(commitPromises);
    const commits = commitResults
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const payload = {
      username,
      repos: processedRepos.slice(0, 30),
      commits,
      stats: {
        totalRepos: processedRepos.length,
        activeReposCount: activeRepos.length,
        staleReposCount: staleRepos.length,
        currentStreak,
        totalContributions,
        languageBreakdown
      },
      updatedAt: new Date().toISOString()
    };

    // 6. Save/upsert to PostgreSQL cache
    await prisma.githubCache.upsert({
      where: { id: cacheId },
      update: {
        data: payload,
      },
      create: {
        id: cacheId,
        data: payload,
      },
    });

    return NextResponse.json(payload);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
