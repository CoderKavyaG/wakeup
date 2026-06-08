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
        return NextResponse.json({
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
        });
      }

      if (type === 'analytics') {
        return NextResponse.json({
          data: [
            { visits: 12 },
            { visits: 24 },
            { visits: 8 },
            { visits: 42 },
            { visits: 19 },
            { visits: 31 },
            { visits: 55 }
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
      const res = await fetch(`${VERCEL_API}/v6/deployments?limit=10`, { headers });
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
      const res = await fetch(
        `${VERCEL_API}/v1/web/analytics/timeseries?projectId=${projectId}&from=${Date.now() - 7*86400000}&to=${Date.now()}&granularity=day`,
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
