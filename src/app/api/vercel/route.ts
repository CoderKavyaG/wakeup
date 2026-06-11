import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VERCEL_API = 'https://api.vercel.com';

// GET /api/vercel?type=deployments — last 10 deployments across all projects
// GET /api/vercel?type=analytics&projectId=X — visit stats for a specific project
// GET /api/vercel?type=projects — list all Vercel projects (to match with DevOS projects)
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

  const headers = { Authorization: `Bearer ${user.vercelToken}` };
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (user.vercelToken.startsWith("mock_")) {
      if (type === 'deployments') {
        const vercelProjectId = searchParams.get('vercelProjectId') || searchParams.get('projectId');
        let deploymentsList = [
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
        const period = searchParams.get('period');
        const isLastWeek = period === 'lastweek';
        return NextResponse.json({
          data: isLastWeek ? [
            { visits: 10 },
            { visits: 15 },
            { visits: 8 },
            { visits: 20 },
            { visits: 12 },
            { visits: 18 },
            { visits: 22 }
          ] : [
            { visits: 15 },
            { visits: 25 },
            { visits: 12 },
            { visits: 45 },
            { visits: 20 },
            { visits: 35 },
            { visits: 58 }
          ],
          uniqueVisitors: isLastWeek ? 85 : 176,
          topPaths: [
            { path: "/", visits: isLastWeek ? 60 : 120 },
            { path: "/blog", visits: isLastWeek ? 20 : 45 },
            { path: "/projects", visits: isLastWeek ? 15 : 35 }
          ]
        });
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
      let urlStr = `${VERCEL_API}/v6/deployments?limit=10`;
      if (vercelProjectId) {
        urlStr += `&projectId=${vercelProjectId}`;
      }
      const res = await fetch(urlStr, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `Vercel API returned status ${res.status}` }, { status: res.status });
      }
      return NextResponse.json(await res.json());
    }

    if (type === 'analytics') {
      const projectId = searchParams.get('projectId');
      if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      }
      const period = searchParams.get('period');
      const days = period === 'lastweek' ? 14 : 7;
      const toDays = period === 'lastweek' ? 7 : 0;
      const from = Date.now() - days * 86400000;
      const to = Date.now() - toDays * 86400000;

      const res = await fetch(
        `${VERCEL_API}/v1/web/analytics/timeseries?projectId=${projectId}&from=${from}&to=${to}&granularity=day`,
        { headers }
      );
      if (!res.ok) {
        return NextResponse.json({ error: `Vercel API returned status ${res.status}` }, { status: res.status });
      }
      return NextResponse.json(await res.json());
    }

    if (type === 'projects') {
      const res = await fetch(`${VERCEL_API}/v9/projects?limit=20`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `Vercel API returned status ${res.status}` }, { status: res.status });
      }
      return NextResponse.json(await res.json());
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
      data: { vercelToken: token }
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
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
  }
}
