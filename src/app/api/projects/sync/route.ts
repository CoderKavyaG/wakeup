import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

function normalizeGithubUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//, "");
  if (clean.endsWith(".git")) clean = clean.slice(0, -4);
  if (clean.endsWith("/")) clean = clean.slice(0, -1);
  return clean;
}

function getFaviconUrl(urlString: string): string | null {
  try {
    let cleanUrl = urlString.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const url = new URL(cleanUrl);
    return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { repos } = await request.json();

    if (!Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Load existing projects for this user
    const existingProjects = await prisma.project.findMany({
      where: { userId }
    });

    const syncedProjects = [];

    for (const repo of repos) {
      const repoUrl = repo.html_url || repo.githubUrl;
      if (!repoUrl || !repo.name) continue;

      const targetNormalized = normalizeGithubUrl(repoUrl);
      
      // Check if project exists by name or githubUrl
      const isDuplicate = existingProjects.some(p => {
        const matchesName = p.name.toLowerCase() === repo.name.toLowerCase();
        const matchesGithub = p.githubUrl && normalizeGithubUrl(p.githubUrl) === targetNormalized;
        return matchesName || matchesGithub;
      });

      if (isDuplicate) continue;

      const favicon = getFaviconUrl(repoUrl);

      const p = await prisma.project.create({
        data: {
          name: repo.name,
          description: repo.description || "Synced GitHub repository",
          status: "active",
          githubUrl: repoUrl,
          tags: [repo.language].filter(Boolean),
          projectHealth: 100.0,
          momentumScore: 0.0,
          completionPercentage: 75.0,
          userId,
          workspace: "main",
          type: "code",
          priority: "medium",
          phase: "idea",
          ogImageUrl: favicon
        }
      });
      syncedProjects.push(p);
    }

    return NextResponse.json({ success: true, count: syncedProjects.length, projects: syncedProjects });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
