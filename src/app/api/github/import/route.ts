import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function normalizeGithubUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let clean = url.trim().toLowerCase();
  
  // Remove protocol and subdomains
  clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//, "");
  
  // Remove trailing .git
  if (clean.endsWith(".git")) {
    clean = clean.slice(0, -4);
  }
  
  // Remove trailing slash
  if (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  
  return clean;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { repoName, username = "coderkavyag" } = await request.json();

    if (!repoName) {
      return NextResponse.json({ error: "Missing repository name." }, { status: 400 });
    }

    // Check if repository already exists in project registry for this user (by name or normalized GitHub URL)
    const targetNormalized = normalizeGithubUrl(`github.com/${username}/${repoName}`);
    const userProjects = await prisma.project.findMany({
      where: { userId }
    });

    const existingProject = userProjects.find(p => {
      // 1. Match by name
      if (p.name.trim().toLowerCase() === repoName.trim().toLowerCase()) return true;
      // 2. Match by normalized githubUrl
      if (targetNormalized && normalizeGithubUrl(p.githubUrl) === targetNormalized) return true;
      return false;
    });

    if (existingProject) {
      return NextResponse.json({ error: "Project already imported / registered." }, { status: 409 });
    }

    // 1. Fetch Repository Details
    const headers: HeadersInit = {};
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const repoRes = await fetch(`https://api.github.com/repos/${username}/${repoName}`, { headers });
    if (!repoRes.ok) {
      throw new Error(`Failed to fetch repo data from GitHub. Status: ${repoRes.status}`);
    }
    const repoData = await repoRes.json();

    // 2. Fetch README content
    let readmeSnippet = "";
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        const base64Content = readmeData.content;
        const decodedContent = Buffer.from(base64Content, "base64").toString("utf-8");
        // Get first 500 characters of README as clean snippet
        readmeSnippet = decodedContent.substring(0, 500) + (decodedContent.length > 500 ? "..." : "");
      }
    } catch (e) {
      console.warn("Could not fetch README for project:", repoName, e);
    }

    // 3. Extract languages
    const languages: string[] = [];
    try {
      const langRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/languages`, { headers });
      if (langRes.ok) {
        const langData = await langRes.json();
        languages.push(...Object.keys(langData));
      }
    } catch (e) {
      if (repoData.language) {
        languages.push(repoData.language);
      }
    }

    // 4. Register project in database
    const newProject = await prisma.project.create({
      data: {
        name: repoData.name,
        description: repoData.description || `GitHub Repository: ${repoData.name}`,
        status: "active",
        tags: repoData.topics && repoData.topics.length > 0 ? repoData.topics : (languages.length > 0 ? languages.slice(0, 3) : ["GitHub"]),
        githubUrl: repoData.html_url,
        techStack: languages,
        summary: readmeSnippet || repoData.description || "",
        momentumScore: repoData.stargazers_count > 0 ? repoData.stargazers_count * 10 : 10,
        projectHealth: 100.0,
        completionPercentage: 50.0, // Initial estimate for imported project
        userId,
      },
    });

    return NextResponse.json(newProject);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
