import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const staleCutoff = new Date(Date.now() - 14 * 86400000);

    const [projects, tasks, notes, urls, layoutState] = await Promise.all([
      prisma.project.findMany({
        include: {
          links: true,
          commits: { orderBy: { date: "desc" }, take: 3 },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
      prisma.note.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.url.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.layoutState.findFirst({
        where: { id: "global-layout" },
      }),
    ]);

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
      layoutState,
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
