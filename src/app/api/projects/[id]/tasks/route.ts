import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/tasks - list project tasks
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
        { order: "asc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch project tasks" }, { status: 500 });
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
        order,
        projectId: id,
        userId,
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project task" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/tasks?taskId=X - update a project task
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, completed, priority, milestone, dueDate, order } = body;

    const updated = await prisma.projectTask.update({
      where: { id: taskId, projectId: id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(completed !== undefined && { completed }),
        ...(priority !== undefined && { priority }),
        ...(milestone !== undefined && { milestone: milestone?.trim() || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(order !== undefined && { order }),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update project task" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/tasks?taskId=X - delete a project task
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.projectTask.delete({
      where: { id: taskId, projectId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project task" }, { status: 500 });
  }
}
