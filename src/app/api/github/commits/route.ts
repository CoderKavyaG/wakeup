import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseGithubUrl = (url: string) => {
  const regex = /github\.com\/([^/]+)\/([^/]+)/i;
  const match = url.match(regex);
  if (match) {
    let repo = match[2];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    return { owner: match[1], repo };
  }
  return null;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "CoderKavyaG";
    const days = parseInt(searchParams.get("days") || "7", 10);
    const projectId = searchParams.get("projectId"); 
    
    let token = request.headers.get("Authorization")?.replace("Bearer ", "").replace("token ", "") || process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "No GitHub token provided" }, { status: 401 });
    }

    const headers: HeadersInit = {
      "Authorization": `bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
    };

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceIso = sinceDate.toISOString();

    const whereClause: any = { githubUrl: { not: null } };
    if (projectId) {
      whereClause.id = projectId;
    }

    const projects = await prisma.project.findMany({
      where: whereClause
    });

    const allCommits = [];

    for (const project of projects) {
      const details = parseGithubUrl(project.githubUrl!);
      if (!details) continue;
      
      const { owner, repo } = details;
      
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?since=${sinceIso}&per_page=20`, { headers });
        if (!res.ok) continue;

        const commitsData = await res.json();
        if (!Array.isArray(commitsData)) continue;
        
        for (const c of commitsData) {
          const commitObj = {
            repoName: repo,
            sha: c.sha,
            message: c.commit?.message || "",
            date: new Date(c.commit?.author?.date || c.commit?.committer?.date || new Date()),
            url: c.html_url,
            projectId: project.id
          };
          
          allCommits.push(commitObj);
          
          // Upsert to DB
          await prisma.commit.upsert({
            where: { sha: commitObj.sha },
            update: {
              projectId: commitObj.projectId,
              message: commitObj.message,
            },
            create: commitObj
          });
        }
      } catch (err) {
        console.error(`Failed to fetch commits for ${repo}`, err);
      }
    }

    // Sort by date descending
    allCommits.sort((a, b) => b.date.getTime() - a.date.getTime());

    return NextResponse.json(allCommits);

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
