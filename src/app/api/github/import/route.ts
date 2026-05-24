import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { repoName, username = "TPAteeq" } = await request.json();

    if (!repoName) {
      return NextResponse.json({ error: "Missing repository name." }, { status: 400 });
    }

    // Check if repository already exists in project registry
    const existingProject = await prisma.project.findFirst({
      where: {
        githubUrl: {
          contains: `github.com/${username}/${repoName}`,
          mode: 'insensitive'
        }
      }
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
      },
    });

    return NextResponse.json(newProject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
