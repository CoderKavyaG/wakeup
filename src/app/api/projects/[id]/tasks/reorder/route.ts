import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// POST /api/projects/[id]/tasks/reorder - batch update order of tasks
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { tasks } = body; // Expected: array of { id, order }

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: "Tasks array is required" }, { status: 400 });
    }

    const updates = tasks.map((t: { id: string; order: number }) =>
      prisma.projectTask.update({
        where: { id: t.id, projectId: id },
        data: { order: parseInt(t.order as any) },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to reorder tasks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
