import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseGithubUrl = (url: string) => {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/i;
  const match = url.match(regex);
  if (match) {
    const owner = match[1];
    let repo = match[2];
    if (repo.endsWith(".git")) repo = repo.slice(0, -4);
    return { owner, repo };
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "Missing project ID." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (!project.githubUrl) {
      // No GitHub URL to sync, just update the sync timestamp as a local refresh
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { lastSyncedAt: new Date() }
      });
      return NextResponse.json(updatedProject);
    }

    const githubDetails = parseGithubUrl(project.githubUrl);
    if (!githubDetails) {
      // Invalid GitHub URL format, update local sync timestamp
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { lastSyncedAt: new Date() }
      });
      return NextResponse.json(updatedProject);
    }

    const { owner, repo } = githubDetails;

    // Fetch from GitHub REST API
    const headers: HeadersInit = {};
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Fetch main repo details
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      throw new Error(`Failed to fetch repo ${owner}/${repo} from GitHub. Status: ${repoRes.status}`);
    }
    const repoData = await repoRes.json();

    // 2. Fetch README
    let readmeSnippet = project.summary || "";
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        const base64Content = readmeData.content;
        const decodedContent = Buffer.from(base64Content, "base64").toString("utf-8");
        readmeSnippet = decodedContent.substring(0, 500) + (decodedContent.length > 500 ? "..." : "");
      }
    } catch (e) {
      console.warn("Could not sync README for project:", repo, e);
    }

    // 3. Fetch Languages
    const languages: string[] = [];
    try {
      const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
      if (langRes.ok) {
        const langData = await langRes.json();
        languages.push(...Object.keys(langData));
      }
    } catch (e) {
      console.warn("Could not sync languages for project:", repo, e);
    }

    // 4. Determine stale status (updated more than 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const lastCommitDate = new Date(repoData.pushed_at || repoData.updated_at);
    const isStale = lastCommitDate < thirtyDaysAgo;
    const status = isStale ? "stale" : (project.status === "stale" ? "active" : project.status);

    // 5. Update local database record
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        description: repoData.description || project.description,
        techStack: languages.length > 0 ? languages : project.techStack,
        summary: readmeSnippet || project.summary,
        momentumScore: repoData.stargazers_count > 0 ? repoData.stargazers_count * 10 : project.momentumScore,
        status: status,
        lastSyncedAt: new Date(),
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
