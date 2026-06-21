import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const layoutId = `global-layout-${userId}`;

    const now = new Date();
    const staleCutoff = new Date(Date.now() - 14 * 86400000);

    const [projects, tasks, notes, urls, layoutState, telegramLink] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        include: {
          links: true,
          commits: { orderBy: { date: "desc" }, take: 3 },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: { userId },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.url.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.layoutState.findUnique({
        where: { id: layoutId },
      }),
      prisma.telegramLink.findUnique({
        where: { userId }
      })
    ]);

    let finalLayoutState = layoutState;
    if (layoutState) {
      const widgets = (layoutState.widgets as { type: string; id: string }[]) || [];
      const hasClock = widgets.some((w) => w.type === "clock");
      if (hasClock) {
        const cleanedWidgets = widgets.filter((w) => w.type !== "clock");
        const clockIds = widgets.filter((w) => w.type === "clock").map((w) => w.id);
        const layouts = (layoutState.layouts as Record<string, { i: string }[]>) || {};
        const cleanedLayouts: Record<string, { i: string }[]> = {};
        for (const [breakpoint, items] of Object.entries(layouts)) {
          if (Array.isArray(items)) {
            cleanedLayouts[breakpoint] = items.filter(item => !clockIds.includes(item.i));
          } else {
            cleanedLayouts[breakpoint] = items;
          }
        }

        finalLayoutState = await prisma.layoutState.update({
          where: { id: layoutId },
          data: {
            widgets: cleanedWidgets,
            layouts: cleanedLayouts
          }
        });
      }
    }

    // Fetch Vercel data if configured (with Database Cache + Stale-While-Revalidate pattern)
    let vercelData: {
      hasToken: boolean;
      deployments: any[];
      projects: any[];
      analytics: Record<string, any>;
    } = {
      hasToken: false,
      deployments: [],
      projects: [],
      analytics: {}
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vercelToken: true, groqApiKey: true, openrouterApiKey: true }
    });

    if (user?.vercelToken) {
      vercelData.hasToken = true;
      const cacheId = `vercel-bootstrap-${userId}`;
      
      const cached = await prisma.vercelCache.findUnique({
        where: { id: cacheId }
      });

      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
      const cacheAge = cached ? Date.now() - new Date(cached.updatedAt).getTime() : null;

      if (cached && cacheAge !== null && cacheAge < CACHE_TTL) {
        // Cache is fresh
        vercelData = cached.data as typeof vercelData;
      } else if (cached) {
        // Cache is stale. Serve it immediately to user, but refresh in the background!
        vercelData = cached.data as typeof vercelData;
        
        // Trigger background refresh (non-blocking)
        (async () => {
          try {
            await refreshVercelDataAndCache(userId, user.vercelToken!, projects, cacheId);
          } catch (err) {
            console.error("Background vercel refresh failed", err);
          }
        })();
      } else {
        // No cache exists. Must fetch synchronously this first time.
        vercelData = await fetchVercelDataFromApi(userId, user.vercelToken, projects);
        
        // Save to cache
        await prisma.vercelCache.upsert({
          where: { id: cacheId },
          update: { data: vercelData as any },
          create: { id: cacheId, data: vercelData as any, userId }
        });
      }
    }

    // Compute derived signals server-side — never re-compute in widgets
    const staleProjects = projects.filter(
      (p) => new Date(p.updatedAt) < staleCutoff
    );
    const overdueTasks = tasks.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now
    );
    const todayTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === now.toDateString();
    });
    const incompleteTasks = tasks.filter((t) => !t.completed);

    return NextResponse.json({
      userId,
      telegramLinked: !!telegramLink,
      projects,
      tasks,
      incompleteTasks,
      notes,
      urls,
      layoutState: finalLayoutState,
      vercel: vercelData,
      ai: {
        hasGroqApiKey: !!user?.groqApiKey,
        hasOpenrouterApiKey: !!user?.openrouterApiKey,
      },
      derived: {
        staleProjects: staleProjects.map((p) => p.id),
        overdueTasks: overdueTasks.map((t) => t.id),
        todayTasks: todayTasks.map((t) => t.id),
        totalStale: staleProjects.length,
        totalOverdue: overdueTasks.length,
        totalToday: todayTasks.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bootstrap failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────
// Vercel Cache Helpers (Fetch API & Save Cache)
// ────────────────────────────────────────────────────────────────

async function fetchVercelDataFromApi(userId: string, encryptedVercelToken: string, projects: any[]) {
  const vercelData = {
    hasToken: true,
    deployments: [] as any[],
    projects: [] as any[],
    analytics: {} as Record<string, any>
  };

  const decryptedToken = decrypt(encryptedVercelToken);
  const vercelHeaders = { Authorization: `Bearer ${decryptedToken}` };

  try {
    let depRes: { deployments?: any[] } | null = null;
    let projRes: { projects?: any[] } | null = null;

    if (decryptedToken.startsWith("mock_")) {
      depRes = {
        deployments: [
          {
            uid: "dep_1",
            projectId: "prj_wakeup",
            state: "READY",
            name: "wakeup",
            created: Date.now() - 3600000,
            meta: {
              githubCommitMessage: "fix: resolve prisma memory leak in agent",
              githubCommitRef: "main"
            }
          },
          {
            uid: "dep_2",
            projectId: "prj_wakeup",
            state: "BUILDING",
            name: "wakeup",
            created: Date.now() - 7200000,
            meta: {
              githubCommitMessage: "feat: add vercel live stats dashboard widget",
              githubCommitRef: "main"
            }
          },
          {
            uid: "dep_3",
            projectId: "prj_wakeup",
            state: "READY",
            name: "wakeup",
            created: Date.now() - 86400000,
            meta: {
              githubCommitMessage: "fix: dashboard clock widget width overflow",
              githubCommitRef: "main"
            }
          }
        ]
      };
      projRes = {
        projects: [
          {
            id: "prj_wakeup",
            name: "wakeup",
            link: { repo: "wakeup" }
          },
          {
            id: "prj_gridlock",
            name: "GRIDLOCK",
            link: { repo: "GRIDLOCK" }
          }
        ]
      };
    } else {
      const [d, p] = await Promise.all([
        fetch("https://api.vercel.com/v6/deployments?limit=10", { headers: vercelHeaders }).then(r => r.ok ? r.json() as Promise<{ deployments?: any[] }> : null).catch(() => null),
        fetch("https://api.vercel.com/v9/projects?limit=20", { headers: vercelHeaders }).then(r => r.ok ? r.json() as Promise<{ projects?: any[] }> : null).catch(() => null)
      ]);
      depRes = d;
      projRes = p;
    }

    if (depRes?.deployments) {
      vercelData.deployments = depRes.deployments;
    }

    let vercelProjectsList: any[] = [];
    if (projRes?.projects) {
      vercelProjectsList = projRes.projects;
      vercelData.projects = projRes.projects;
    }

    // Auto-match by comparing repository names
    const projectsToUpdate = [];
    for (const p of projects) {
      if (!p.vercelProjectId && p.githubUrl && vercelProjectsList.length > 0) {
        const githubMatch = p.githubUrl.match(/github\.com\/[^/]+\/([^/]+)/i);
        const repoName = githubMatch ? githubMatch[1].replace(/\.git$/i, "").toLowerCase() : null;

        if (repoName) {
          const matchedVercel = vercelProjectsList.find(vp => {
            const vpName = vp.name.toLowerCase();
            const vpRepo = vp.link?.repo?.toLowerCase();
            return vpName === repoName || vpRepo === repoName;
          });

          if (matchedVercel) {
            p.vercelProjectId = matchedVercel.id;
            const alias = matchedVercel.targets?.production?.alias?.[0] || matchedVercel.alias?.[0] || matchedVercel.latestDeployments?.[0]?.url;
            const vercelUrl = alias ? (alias.startsWith("http") ? alias : `https://${alias}`) : null;
            
            projectsToUpdate.push(
              prisma.project.update({
                where: { id: p.id },
                data: { 
                  vercelProjectId: matchedVercel.id,
                  ...(vercelUrl ? { liveUrl: vercelUrl } : {})
                }
              })
            );
          }
        }
      }
    }

    if (projectsToUpdate.length > 0) {
      await Promise.all(projectsToUpdate);
    }

    // Fetch analytics for matched projects
    const matchedProjects = projects.filter((p: any) => p.vercelProjectId);
    if (matchedProjects.length > 0) {
      const analyticsPromises = matchedProjects.map(async (p: any) => {
        try {
          if (decryptedToken.startsWith("mock_")) {
            return {
              projectId: p.id,
              analytics: {
                error: "Unable to fetch the right visits from Vercel"
              }
            };
          }
          const analyticsRes = await fetch(
            `https://api.vercel.com/v1/web/analytics/timeseries?projectId=${p.vercelProjectId}&from=${Date.now() - 7*86400000}&to=${Date.now()}&granularity=day`,
            { headers: vercelHeaders }
          );
          if (analyticsRes.ok) {
            const analyticsJson = await analyticsRes.json();
            return { projectId: p.id, analytics: analyticsJson };
          }
        } catch (e) {
          console.error(`Failed to fetch analytics for project ${p.name}`, e);
        }
        return null;
      });

      const analyticsResults = await Promise.all(analyticsPromises);
      analyticsResults.forEach((res) => {
        if (res) {
          vercelData.analytics[res.projectId] = res.analytics;
        }
      });
    }
  } catch (vercelError) {
    console.error("Vercel bootstrap fetch failed", vercelError);
  }

  return vercelData;
}

async function refreshVercelDataAndCache(userId: string, encryptedVercelToken: string, projects: any[], cacheId: string) {
  const vercelData = await fetchVercelDataFromApi(userId, encryptedVercelToken, projects);
  await prisma.vercelCache.upsert({
    where: { id: cacheId },
    update: { data: vercelData as any },
    create: { id: cacheId, data: vercelData as any, userId }
  });
}
