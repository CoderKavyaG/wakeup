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

    let finalLayoutState = layoutState;
    if (layoutState) {
      const widgets = (layoutState.widgets as any[]) || [];
      const hasClock = widgets.some((w: any) => w.type === "clock");
      if (hasClock) {
        const cleanedWidgets = widgets.filter((w: any) => w.type !== "clock");
        const clockIds = widgets.filter((w: any) => w.type === "clock").map((w: any) => w.id);
        const layouts = (layoutState.layouts as Record<string, any[]>) || {};
        const cleanedLayouts: Record<string, any[]> = {};
        for (const [breakpoint, items] of Object.entries(layouts)) {
          if (Array.isArray(items)) {
            cleanedLayouts[breakpoint] = items.filter(item => !clockIds.includes(item.i));
          } else {
            cleanedLayouts[breakpoint] = items;
          }
        }

        finalLayoutState = await prisma.layoutState.update({
          where: { id: "global-layout" },
          data: {
            widgets: cleanedWidgets,
            layouts: cleanedLayouts
          }
        });
      }
    }

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
      layoutState: finalLayoutState,
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
