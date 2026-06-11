import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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

    const [projects, tasks, notes, urls, layoutState] = await Promise.all([
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

    // Fetch Vercel data if configured
    const vercelData: {
      hasToken: boolean;
      deployments: unknown[];
      projects: unknown[];
      analytics: Record<string, unknown>;
    } = {
      hasToken: false,
      deployments: [],
      projects: [],
      analytics: {}
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vercelToken: true }
    });

    if (user?.vercelToken) {
      vercelData.hasToken = true;
      const vercelHeaders = { Authorization: `Bearer ${user.vercelToken}` };

      try {
        let depRes: { deployments?: unknown[] } | null = null;
        let projRes: { projects?: unknown[] } | null = null;

        if (user.vercelToken.startsWith("mock_")) {
          // Simulated mock responses for Vercel
          depRes = {
            deployments: [
              {
                uid: "dep_1",
                projectId: "prj_wakeup",
                state: "ERROR",
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
            fetch("https://api.vercel.com/v6/deployments?limit=10", { headers: vercelHeaders }).then(r => r.ok ? r.json() as Promise<{ deployments?: unknown[] }> : null).catch(() => null),
            fetch("https://api.vercel.com/v9/projects?limit=20", { headers: vercelHeaders }).then(r => r.ok ? r.json() as Promise<{ projects?: unknown[] }> : null).catch(() => null)
          ]);
          depRes = d;
          projRes = p;
        }

        if (depRes?.deployments) {
          vercelData.deployments = depRes.deployments;
        }

        let vercelProjectsList: { id: string; name: string; link?: { repo?: string } }[] = [];
        if (projRes?.projects) {
          vercelProjectsList = projRes.projects as { id: string; name: string; link?: { repo?: string } }[];
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
                const alias = (matchedVercel as any).targets?.production?.alias?.[0] || (matchedVercel as any).alias?.[0] || (matchedVercel as any).latestDeployments?.[0]?.url;
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
        const matchedProjects = projects.filter(p => p.vercelProjectId);
        if (matchedProjects.length > 0) {
          const analyticsPromises = matchedProjects.map(async (p) => {
            try {
              if (user.vercelToken?.startsWith("mock_")) {
                return {
                  projectId: p.id,
                  analytics: {
                    data: [
                      { visits: 12 },
                      { visits: 24 },
                      { visits: 8 },
                      { visits: 42 },
                      { visits: 19 },
                      { visits: 31 },
                      { visits: 55 }
                    ]
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
        console.error("Vercel bootstrap failed", vercelError);
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
      projects,
      tasks,
      incompleteTasks,
      notes,
      urls,
      layoutState: finalLayoutState,
      vercel: vercelData,
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
