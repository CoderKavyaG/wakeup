import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/ideas?projectId=X  — ideas for one project
// GET /api/ideas              — all ideas across all projects (global board)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const ideas = await prisma.idea.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ starred: "desc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(ideas);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
}

// POST /api/ideas — { content, projectId?, source?, status? }
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await request.json();
    const { content, projectId, source = "manual", status = "raw" } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // If projectId given, verify ownership
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.userId !== userId) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    const idea = await prisma.idea.create({
      data: { content: content.trim(), source, status, projectId: projectId || null, userId },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json(idea);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
  }
}

// PATCH /api/ideas?ideaId=X — { status?, starred?, content? }
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("ideaId");

    if (!ideaId) {
      return NextResponse.json({ error: "ideaId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status, starred, content } = body;

    const updated = await prisma.idea.update({
      where: { id: ideaId, userId },
      data: {
        ...(status !== undefined && { status }),
        ...(starred !== undefined && { starred }),
        ...(content !== undefined && { content }),
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }
}

// DELETE /api/ideas?ideaId=X
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("ideaId");

    if (!ideaId) {
      return NextResponse.json({ error: "ideaId is required" }, { status: 400 });
    }

    await prisma.idea.delete({ where: { id: ideaId, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}
