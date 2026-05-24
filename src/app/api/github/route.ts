import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "TPAteeq";

    // 1. Check cache first
    const cacheId = `github-cache-${username}`;
    const existingCache = await prisma.githubCache.findUnique({
      where: { id: cacheId },
    });

    if (existingCache) {
      const cacheAge = Date.now() - new Date(existingCache.updatedAt).getTime();
      if (cacheAge < CACHE_TTL_MS) {
        // Return fresh cached data!
        return NextResponse.json(existingCache.data);
      }
    }

    // 2. Fetch fresh data from GitHub API
    const headers: HeadersInit = {};
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch repositories
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, {
      headers,
      next: { revalidate: 60 }
    });
    
    if (!reposRes.ok) {
      // If we are rate limited or query fails, fall back to cached data even if expired!
      if (existingCache) {
        return NextResponse.json(existingCache.data);
      }
      throw new Error(`GitHub API returned status ${reposRes.status}`);
    }

    const reposData = await reposRes.json();

    // Fetch public events to extract commits and calculate streaks
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
      headers,
      next: { revalidate: 60 }
    });

    let eventsData: any[] = [];
    if (eventsRes.ok) {
      eventsData = await eventsRes.json();
    }

    // 3. Process Repositories
    const processedRepos = (reposData as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || null,
      html_url: r.html_url,
      updated_at: r.updated_at,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks,
      language: r.language || null,
    }));

    // Detect active vs stale repos (updated within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeRepos = processedRepos.filter(r => new Date(r.updated_at) >= thirtyDaysAgo);
    const staleRepos = processedRepos.filter(r => new Date(r.updated_at) < thirtyDaysAgo);

    // Calculate language usage insights
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

    // 4. Process Commits and calculate streaks
    const commits: any[] = [];
    const commitDates = new Set<string>();

    eventsData.forEach((event: any) => {
      if (event.type === "PushEvent" && event.payload?.commits) {
        const dateStr = event.created_at.split("T")[0];
        commitDates.add(dateStr);

        event.payload.commits.forEach((c: any) => {
          commits.push({
            sha: c.sha.substring(0, 7),
            repoName: event.repo.name.split("/")[1] || event.repo.name,
            message: c.message,
            date: event.created_at,
            url: `https://github.com/${event.repo.name}/commit/${c.sha}`
          });
        });
      }
    });

    // Commit Streak Logic
    let currentStreak = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0];

    // Check if committed today or yesterday to continue streak
    let hasActivity = commitDates.has(todayStr) || commitDates.has(yesterdayStr);
    
    if (hasActivity) {
      currentStreak = 0;
      let checkDate = new Date();
      // Start checking backwards from today
      while (true) {
        const checkStr = checkDate.toISOString().split("T")[0];
        if (commitDates.has(checkStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // If checkDate is today, let it slide to check yesterday. Otherwise streak is broken.
          if (checkStr === todayStr) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }
    }

    const payload = {
      username,
      repos: processedRepos.slice(0, 8),
      commits: commits.slice(0, 6),
      stats: {
        totalRepos: processedRepos.length,
        activeReposCount: activeRepos.length,
        staleReposCount: staleRepos.length,
        currentStreak,
        languageBreakdown
      },
      updatedAt: new Date().toISOString()
    };

    // 5. Save/upsert to PostgreSQL cache
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
