import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get("workspace");

    const projects = await prisma.project.findMany({
      where: { 
        userId,
        ...(workspace ? { workspace } : {})
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function getFaviconUrl(urlString: string): string | null {
  try {
    let cleanUrl = urlString.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const url = new URL(cleanUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  } catch {
    return null;
  }
}

async function autoMatchVercel(githubUrl: string | null, liveUrl: string | null, userId: string) {
  if (!githubUrl && !liveUrl) return { vercelProjectId: null, liveUrl: null };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vercelToken: true }
    });

    if (!user?.vercelToken) {
      return { vercelProjectId: null, liveUrl: null };
    }

    let vercelProjectsList = [];
    if (user.vercelToken.startsWith("mock_")) {
      vercelProjectsList = [
        {
          id: "prj_wakeup",
          name: "wakeup",
          link: { repo: "wakeup" },
          targets: { production: { alias: ["wakeup.vercel.app"] } }
        },
        {
          id: "prj_gridlock",
          name: "GRIDLOCK",
          link: { repo: "GRIDLOCK" },
          targets: { production: { alias: ["gridlock.vercel.app"] } }
        }
      ];
    } else {
      const headers = { Authorization: `Bearer ${user.vercelToken}` };
      // 1. Personal workspace projects
      try {
        const res = await fetch("https://api.vercel.com/v9/projects?limit=50", { headers });
        if (res.ok) {
          const data = await res.json();
          vercelProjectsList.push(...(data.projects || []));
        }
      } catch (e) {}

      // 2. Teams projects
      try {
        const teamsRes = await fetch("https://api.vercel.com/v2/teams", { headers });
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.teams || [];
          for (const team of teams) {
            try {
              const teamProjRes = await fetch(`https://api.vercel.com/v9/projects?limit=50&teamId=${team.id}`, { headers });
              if (teamProjRes.ok) {
                const teamProjData = await teamProjRes.json();
                vercelProjectsList.push(...(teamProjData.projects || []));
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    let matchedVercel = null;

    // 1. Match by Github Repo
    if (githubUrl) {
      const githubMatch = githubUrl.match(/github\.com\/[^/]+\/([^/]+)/i);
      const repoName = githubMatch ? githubMatch[1].replace(/\.git$/i, "").toLowerCase() : null;
      if (repoName) {
        matchedVercel = vercelProjectsList.find((vp: any) => {
          const vpName = vp.name.toLowerCase();
          const vpRepo = vp.link?.repo?.toLowerCase() || vp.targets?.production?.meta?.githubCommitRepo?.toLowerCase();
          return vpName === repoName || vpRepo === repoName;
        });
      }
    }

    // 2. Match by Live URL domain if no github match
    if (!matchedVercel && liveUrl) {
      try {
        let cleanLive = liveUrl.trim();
        if (!cleanLive.startsWith("http://") && !cleanLive.startsWith("https://")) {
          cleanLive = "https://" + cleanLive;
        }
        const liveDomain = new URL(cleanLive).hostname.toLowerCase();
        matchedVercel = vercelProjectsList.find((vp: any) => {
          const aliases = vp.targets?.production?.alias || vp.alias || [];
          if (aliases.some((a: string) => a.toLowerCase() === liveDomain)) {
            return true;
          }
          const name = vp.name.toLowerCase();
          if (liveDomain.startsWith(name)) {
            return true;
          }
          return false;
        });
      } catch {}
    }

    if (matchedVercel) {
      const alias = matchedVercel.targets?.production?.alias?.[0] || matchedVercel.alias?.[0] || matchedVercel.latestDeployments?.[0]?.url;
      const vercelUrl = alias ? (alias.startsWith("http") ? alias : `https://${alias}`) : null;
      return {
        vercelProjectId: matchedVercel.id,
        liveUrl: vercelUrl
      };
    }

    return { vercelProjectId: null, liveUrl: null };
  } catch (error) {
    console.error("Error in autoMatchVercel:", error);
    return { vercelProjectId: null, liveUrl: null };
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { 
      name, 
      description, 
      status, 
      tags, 
      githubUrl, 
      liveUrl, 
      folderPath,
      workspace,
      type,
      priority,
      pinned,
      confidenceLevel,
      effortEstimate,
      potentialImpact,
      stage,
      phase,
      ogImageUrl
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // Check if project already exists to prevent duplication for this user
    let existingProject = null;
    if (githubUrl) {
      existingProject = await prisma.project.findFirst({
        where: {
          userId,
          githubUrl: {
            equals: githubUrl,
            mode: "insensitive"
          }
        }
      });
    }
    if (!existingProject && folderPath) {
      existingProject = await prisma.project.findFirst({
        where: {
          userId,
          folderPath: {
            equals: folderPath,
            mode: "insensitive"
          }
        }
      });
    }

    if (existingProject) {
      let vercelProjectId = existingProject.vercelProjectId;
      let matchedLiveUrl = existingProject.liveUrl || liveUrl;
      if (!vercelProjectId && (githubUrl || liveUrl)) {
        const match = await autoMatchVercel(githubUrl, liveUrl, userId);
        if (match.vercelProjectId) {
          vercelProjectId = match.vercelProjectId;
          if (!matchedLiveUrl && match.liveUrl) {
            matchedLiveUrl = match.liveUrl;
          }
        }
      }

      // If project exists, move it to the new phase, workspace, and update favicon if missing
      const updated = await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          phase: phase || existingProject.phase,
          workspace: workspace || existingProject.workspace,
          vercelProjectId: vercelProjectId || undefined,
          liveUrl: matchedLiveUrl || undefined,
          ...((matchedLiveUrl || githubUrl) && !existingProject.ogImageUrl && {
            ogImageUrl: getFaviconUrl(matchedLiveUrl || githubUrl || "")
          })
        }
      });
      return NextResponse.json(updated);
    }

    let computedLiveUrl = liveUrl || null;
    let matchedVercelId = null;

    if (githubUrl || liveUrl) {
      const match = await autoMatchVercel(githubUrl, liveUrl, userId);
      if (match.vercelProjectId) {
        matchedVercelId = match.vercelProjectId;
        if (!computedLiveUrl && match.liveUrl) {
          computedLiveUrl = match.liveUrl;
        }
      }
    }

    let computedOgImageUrl = ogImageUrl || null;
    if (!computedOgImageUrl) {
      const targetUrl = computedLiveUrl || githubUrl;
      if (targetUrl) {
        computedOgImageUrl = getFaviconUrl(targetUrl);
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        status: status || "active",
        tags: tags || [],
        githubUrl: githubUrl || null,
        liveUrl: computedLiveUrl,
        vercelProjectId: matchedVercelId,
        folderPath: folderPath || null,
        projectHealth: 100.0,
        momentumScore: 0.0,
        completionPercentage: 0.0,
        userId,
        workspace: workspace || "main",
        type: type || "code",
        priority: priority || "medium",
        pinned: pinned !== undefined ? pinned : false,
        confidenceLevel: confidenceLevel !== undefined ? confidenceLevel : null,
        effortEstimate: effortEstimate || null,
        potentialImpact: potentialImpact || null,
        stage: stage || null,
        phase: phase || "idea",
        ogImageUrl: computedOgImageUrl,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { id, ...updateData } = body;

    if ((updateData.githubUrl || updateData.liveUrl) && !updateData.vercelProjectId) {
      const match = await autoMatchVercel(updateData.githubUrl || null, updateData.liveUrl || null, userId);
      if (match.vercelProjectId) {
        updateData.vercelProjectId = match.vercelProjectId;
        if (!updateData.liveUrl && match.liveUrl) {
          updateData.liveUrl = match.liveUrl;
        }
      }
    }

    if ((updateData.liveUrl || updateData.githubUrl) && !updateData.ogImageUrl) {
      const targetUrl = updateData.liveUrl || updateData.githubUrl;
      const favicon = getFaviconUrl(targetUrl);
      if (favicon) {
        updateData.ogImageUrl = favicon;
      }
    }

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
