import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// PATCH /api/projects/[id]/tasks/[taskId] - update any task field
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id, taskId } = await params;

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
        ...(order !== undefined && { order: parseInt(order) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update project task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/tasks/[taskId] - delete task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id, taskId } = await params;

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.projectTask.delete({
      where: { id: taskId, projectId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete project task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
