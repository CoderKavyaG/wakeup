import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const weekThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Stale warnings
    const staleProjects = await prisma.project.findMany({
      where: {
        updatedAt: { lt: staleThreshold },
        status: { not: "completed" },
      },
      take: 5,
    });
    const staleWarnings = staleProjects.map(
      (p) =>
        `${p.name} hasn't been touched in ${Math.floor((Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days`
    );

    // Momentum insights
    const recentProjects = await prisma.project.findMany({
      where: { updatedAt: { gt: weekThreshold } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    const momentumInsights = recentProjects.length > 0
      ? [`Strong momentum: ${recentProjects.length} projects active this week`]
      : ["Momentum is low. Time to ship something."];

    // Focus recommendations
    const activeTasks = await prisma.task.findMany({
      where: { completed: false },
      orderBy: { priority: "desc" },
      take: 3,
    });
    const focusRecommendations = activeTasks.map((t) => `Focus on: ${t.title}`);

    // Unfinished alerts
    const unfinishedTasks = await prisma.task.findMany({
      where: {
        completed: false,
        dueDate: { lt: new Date().toISOString() },
      },
      take: 3,
    });
    const unfinishedAlerts = unfinishedTasks.map(
      (t) => `⚠️ Overdue: ${t.title}`
    );

    return NextResponse.json({
      briefing: {
        staleWarnings: staleWarnings.length > 0 ? staleWarnings : ["All projects are fresh!"],
        momentumInsights,
        focusRecommendations: focusRecommendations.length > 0 ? focusRecommendations : ["No active tasks"],
        unfinishedAlerts: unfinishedAlerts.length > 0 ? unfinishedAlerts : [],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Briefing error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
