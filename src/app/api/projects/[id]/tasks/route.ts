import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/tasks - list project tasks, ordered by milestone then order
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

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: id },
      orderBy: [
        { milestone: "asc" },
        { order: "asc" }
      ]
    });

    return NextResponse.json(tasks);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch project tasks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/projects/[id]/tasks - create a project task
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
    const { title, priority = "medium", milestone, dueDate, order = 0 } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.projectTask.create({
      data: {
        title: title.trim(),
        priority,
        milestone: milestone?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: parseInt(order as any) || 0,
        projectId: id,
        userId,
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create project task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
