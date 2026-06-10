import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/ideas - list ideas
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ideas = await prisma.idea.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(ideas);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
}

// POST /api/projects/[id]/ideas - create an idea
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, source = "manual", status = "raw" } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const idea = await prisma.idea.create({
      data: {
        content: content.trim(),
        source,
        status,
        projectId: id,
        userId,
      }
    });

    return NextResponse.json(idea);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/ideas?ideaId=X - update an idea
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("ideaId");

    if (!ideaId) {
      return NextResponse.json({ error: "Idea ID is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, starred, content } = body;

    const updated = await prisma.idea.update({
      where: { id: ideaId, projectId: id },
      data: {
        ...(status !== undefined && { status }),
        ...(starred !== undefined && { starred }),
        ...(content !== undefined && { content }),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/ideas?ideaId=X - delete an idea
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("ideaId");

    if (!ideaId) {
      return NextResponse.json({ error: "Idea ID is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.idea.delete({
      where: { id: ideaId, projectId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}
