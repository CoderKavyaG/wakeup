import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/encryption";

const VERCEL_API = 'https://api.vercel.com';

// GET /api/vercel?type=deployments — last 10 deployments across all projects
// GET /api/vercel?type=analytics&projectId=X — visit stats for a specific project
// GET /api/vercel?type=projects — list all Vercel projects (to match with Wakeup projects)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vercelToken: true }
  });

  if (!user?.vercelToken) {
    return NextResponse.json({ error: "Vercel integration not configured" }, { status: 400 });
  }

  const decryptedToken = decrypt(user.vercelToken);
  const headers = { Authorization: `Bearer ${decryptedToken}` };
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (decryptedToken.startsWith("mock_")) {
      if (type === 'deployments') {
        const vercelProjectId = searchParams.get('vercelProjectId') || searchParams.get('projectId');
        let deploymentsList = [
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
        ];

        if (vercelProjectId) {
          if (vercelProjectId === "prj_gridlock") {
            deploymentsList = [
              {
                uid: "dep_g1",
                projectId: "prj_gridlock",
                state: "READY",
                name: "gridlock",
                created: Date.now() - 1800000,
                meta: {
                  githubCommitMessage: "feat: initial commit for gridlock layout scheduler",
                  githubCommitRef: "main"
                }
              }
            ];
          } else {
            deploymentsList = deploymentsList.filter(d => d.projectId === vercelProjectId);
          }
        }

        return NextResponse.json({ deployments: deploymentsList });
      }

      if (type === 'analytics') {
        const projectId = searchParams.get('vercelProjectId') || searchParams.get('projectId') || "default";
        const fallbackData = [];
        const seed = projectId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
          const dayOfWeek = new Date(date).getDay();
          const dayFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;
          const sineVal = Math.sin(i * 1.5 + seed);
          const visits = Math.max(5, Math.round((50 + (seed % 80)) * dayFactor * (0.85 + sineVal * 0.15)));
          fallbackData.push({ date, visits, views: Math.round(visits * (1.5 + sineVal * 0.2)) });
        }
        return NextResponse.json({ data: fallbackData, simulated: true });
      }

      if (type === 'projects') {
        return NextResponse.json({
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
        });
      }
    }

    if (type === 'deployments') {
      const vercelProjectId = searchParams.get('vercelProjectId') || searchParams.get('projectId');
      if (!vercelProjectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      }

      const cacheId = `vercel-deployments-${vercelProjectId}-${userId}`;
      const cached = await prisma.vercelCache.findUnique({ where: { id: cacheId } });
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
      
      const fetchFresh = async () => {
        let urlStr = `${VERCEL_API}/v6/deployments?limit=10&projectId=${vercelProjectId}`;
        let res = await fetch(urlStr, { headers });
        
        if (!res.ok) {
          try {
            const teamsRes = await fetch(`${VERCEL_API}/v2/teams`, { headers });
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json();
              const teams = teamsData.teams || [];
              for (const team of teams) {
                const teamUrlStr = `${VERCEL_API}/v6/deployments?limit=10&projectId=${vercelProjectId}&teamId=${team.id}`;
                const teamRes = await fetch(teamUrlStr, { headers });
                if (teamRes.ok) {
                  res = teamRes;
                  break;
                }
              }
            }
          } catch (e) {
            console.error("Failed to check teams for deployments:", e);
          }
        }

        if (!res.ok) {
          throw new Error(`Vercel API returned status ${res.status}`);
        }
        const data = await res.json();
        await prisma.vercelCache.upsert({
          where: { id: cacheId },
          update: { data },
          create: { id: cacheId, data, userId }
        });
        return data;
      };

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
        if (cacheAge < CACHE_TTL) {
          return NextResponse.json(cached.data);
        }
        // Stale-while-revalidate background refresh
        (async () => {
          try {
            await fetchFresh();
          } catch (e) {
            console.error("Background fresh deployments fetch failed", e);
          }
        })();
        return NextResponse.json(cached.data);
      }

      try {
        const data = await fetchFresh();
        return NextResponse.json(data);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    if (type === 'analytics') {
      const projectId = searchParams.get('projectId');
      if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      }
      const period = searchParams.get('period') || 'default';
      
      const cacheId = `vercel-analytics-${projectId}-${period}-${userId}`;
      const cached = await prisma.vercelCache.findUnique({ where: { id: cacheId } });
      const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL

      const fetchFresh = async () => {
        const days = period === 'lastweek' ? 14 : 7;
        const toDays = period === 'lastweek' ? 7 : 0;
        const from = Date.now() - days * 86400000;
        const to = Date.now() - toDays * 86400000;

        let urlStr = `${VERCEL_API}/v1/web/analytics/timeseries?projectId=${projectId}&from=${from}&to=${to}&granularity=day`;
        let res = await fetch(urlStr, { headers });
        
        if (!res.ok) {
          try {
            const teamsRes = await fetch(`${VERCEL_API}/v2/teams`, { headers });
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json();
              const teams = teamsData.teams || [];
              for (const team of teams) {
                const teamUrlStr = `${VERCEL_API}/v1/web/analytics/timeseries?projectId=${projectId}&from=${from}&to=${to}&granularity=day&teamId=${team.id}`;
                const teamRes = await fetch(teamUrlStr, { headers });
                if (teamRes.ok) {
                  res = teamRes;
                  break;
                }
              }
            }
          } catch (e) {
            console.error("Failed to check teams for analytics:", e);
          }
        }

        let data;
        if (res.ok) {
          data = await res.json();
        } else {
          // Fallback if real analytics is not enabled on Vercel
          const fallbackData = [];
          const seed = projectId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
          for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
            const dayOfWeek = new Date(date).getDay();
            const dayFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;
            const sineVal = Math.sin(i * 1.5 + seed);
            const visits = Math.max(5, Math.round((50 + (seed % 80)) * dayFactor * (0.85 + sineVal * 0.15)));
            fallbackData.push({ date, visits, views: Math.round(visits * (1.5 + sineVal * 0.2)) });
          }
          data = { data: fallbackData, simulated: true };
        }

        await prisma.vercelCache.upsert({
          where: { id: cacheId },
          update: { data },
          create: { id: cacheId, data, userId }
        });
        return data;
      };

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
        if (cacheAge < CACHE_TTL) {
          return NextResponse.json(cached.data);
        }
        // Stale-while-revalidate background refresh
        (async () => {
          try {
            await fetchFresh();
          } catch (e) {
            console.error("Background fresh analytics fetch failed", e);
          }
        })();
        return NextResponse.json(cached.data);
      }

      try {
        const data = await fetchFresh();
        return NextResponse.json(data);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    if (type === 'projects') {
      const cacheId = `vercel-projects-${userId}`;
      const cached = await prisma.vercelCache.findUnique({ where: { id: cacheId } });
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL

      const fetchFresh = async () => {
        const allProjects = [];

        // 1. Fetch personal projects
        try {
          const personalRes = await fetch(`${VERCEL_API}/v9/projects?limit=50`, { headers });
          if (personalRes.ok) {
            const personalData = await personalRes.json();
            allProjects.push(...(personalData.projects || []));
          }
        } catch (e) {
          console.error("Failed to fetch personal vercel projects:", e);
        }

        // 2. Fetch teams
        try {
          const teamsRes = await fetch(`${VERCEL_API}/v2/teams`, { headers });
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            const teams = teamsData.teams || [];
            
            for (const team of teams) {
              try {
                const teamProjRes = await fetch(`${VERCEL_API}/v9/projects?limit=50&teamId=${team.id}`, { headers });
                if (teamProjRes.ok) {
                  const teamProjData = await teamProjRes.json();
                  allProjects.push(...(teamProjData.projects || []));
                }
              } catch (e) {
                console.error(`Failed to fetch vercel projects for team ${team.id}:`, e);
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch vercel teams:", e);
        }

        const data = { projects: allProjects };
        await prisma.vercelCache.upsert({
          where: { id: cacheId },
          update: { data },
          create: { id: cacheId, data, userId }
        });
        return data;
      };

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
        if (cacheAge < CACHE_TTL) {
          return NextResponse.json(cached.data);
        }
        // Stale-while-revalidate background refresh
        (async () => {
          try {
            await fetchFresh();
          } catch (e) {
            console.error("Background fresh projects fetch failed", e);
          }
        })();
        return NextResponse.json(cached.data);
      }

      try {
        const data = await fetchFresh();
        return NextResponse.json(data);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vercel API request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/vercel — save Vercel token
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { vercelToken: encrypt(token) }
    });

    // Invalidate Vercel cache for this user
    await prisma.vercelCache.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
  }
}

// DELETE /api/vercel — remove Vercel token
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { vercelToken: null }
    });

    // Invalidate Vercel cache for this user
    await prisma.vercelCache.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
  }
}
