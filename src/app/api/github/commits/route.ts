import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { decrypt } from "@/lib/encryption";

const parseGithubUrl = (url: string) => {
  const regex = /github\.com\/([^/]+)\/([^/]+)/i;
  const match = url.match(regex);
  if (match) {
    let repo = match[2];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    // strip query strings / fragments
    repo = repo.split('?')[0].split('#')[0];
    return { owner: match[1], repo };
  }
  return null;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const projectId = searchParams.get("projectId"); 
    
    // Retrieve and decrypt the user's database-stored GitHub token
    let token = process.env.GITHUB_TOKEN;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true }
    });
    if (dbUser?.githubToken) {
      token = decrypt(dbUser.githubToken);
    }

    const headers: HeadersInit = {
      "Accept": "application/vnd.github.v3+json",
    };
    if (token) {
      headers["Authorization"] = `bearer ${token}`;
    }

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceIso = sinceDate.toISOString();

    const whereClause: any = { githubUrl: { not: null }, userId };
    if (projectId) {
      whereClause.id = projectId;
    }

    const projects = await prisma.project.findMany({
      where: whereClause
    });

    // First, try to serve from DB cache
    const dbCommits = await prisma.commit.findMany({
      where: {
        projectId: projectId ? projectId : { in: projects.map(p => p.id) },
        date: { gte: sinceDate }
      },
      orderBy: { date: "desc" },
      take: 50
    });

    const allCommits: any[] = [];

    for (const project of projects) {
      const details = parseGithubUrl(project.githubUrl!);
      if (!details) continue;
      
      const { owner, repo } = details;
      
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?since=${sinceIso}&per_page=30`, { headers });
        if (!res.ok) {
          // fallback to db
          let cached = dbCommits.filter(c => c.projectId === project.id);
          if (cached.length === 0) {
            const fallbackCommit = await prisma.commit.findFirst({
              where: { projectId: project.id },
              orderBy: { date: "desc" }
            });
            if (fallbackCommit) cached = [fallbackCommit];
          }
          allCommits.push(...cached.map(c => ({
            sha: c.sha,
            message: c.message,
            date: c.date,
            url: c.url,
            repoName: c.repoName,
            projectId: c.projectId
          })));
          continue;
        }

        let commitsData = await res.json();
        if (!Array.isArray(commitsData)) continue;

        // If no commits in last 30 days, fetch the single last commit from GitHub
        if (commitsData.length === 0) {
          const fallbackRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, { headers });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (Array.isArray(fallbackData) && fallbackData.length > 0) {
              commitsData = fallbackData;
            }
          }
        }
        
        for (const c of commitsData) {
          const commitObj = {
            repoName: repo,
            sha: c.sha,
            message: c.commit?.message?.split('\n')[0] || "",
            date: new Date(c.commit?.author?.date || c.commit?.committer?.date || new Date()),
            url: c.html_url,
            projectId: project.id
          };
          
          allCommits.push(commitObj);
          
          // Upsert to DB
          try {
            await prisma.commit.upsert({
              where: { sha: commitObj.sha },
              update: { projectId: commitObj.projectId, message: commitObj.message },
              create: commitObj
            });
          } catch (e) {
            // ignore upsert errors
          }
        }
      } catch (err) {
        console.error(`Failed to fetch commits for ${repo}`, err);
        // fallback to db
        let cached = dbCommits.filter(c => c.projectId === project.id);
        if (cached.length === 0) {
          const fallbackCommit = await prisma.commit.findFirst({
            where: { projectId: project.id },
            orderBy: { date: "desc" }
          });
          if (fallbackCommit) cached = [fallbackCommit];
        }
        allCommits.push(...cached.map(c => ({
          sha: c.sha,
          message: c.message,
          date: c.date,
          url: c.url,
          repoName: c.repoName,
          projectId: c.projectId
        })));
      }
    }

    // If no live commits fetched at all, return db cache
    if (allCommits.length === 0 && dbCommits.length > 0) {
      return NextResponse.json(dbCommits.map(c => ({
        sha: c.sha,
        message: c.message,
        date: c.date,
        url: c.url,
        repoName: c.repoName,
        projectId: c.projectId
      })));
    }

    // Sort by date descending
    allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(allCommits);

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
