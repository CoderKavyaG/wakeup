import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch all data in parallel
    const [projects, tasks, notes, urls] = await Promise.all([
      prisma.project.findMany({
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.note.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.url.findMany(),
    ]);

    // Compute system health metrics
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const completedTodayTasks = tasks.filter((t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(t.updatedAt);
      taskDate.setHours(0, 0, 0, 0);
      return t.completed && taskDate.getTime() === today.getTime();
    }).length;
    const capturedNotes = notes.length;

    // Determine developer context and current phase
    const getPhase = () => {
      const staleProjects = projects.filter((p) => {
        const days = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return days > 7;
      });

      const pendingTasks = tasks.filter((t) => !t.completed);
      const recentNotes = notes.filter(
        (n) => Date.now() - new Date(n.createdAt).getTime() < 60 * 60 * 1000
      );

      if (recentNotes.length > 0) return "planning";
      if (pendingTasks.length > 5) return "active-coding";
      if (staleProjects.length > 0) return "review";
      if (activeProjects === 0) return "idle";
      return "deployment";
    };

    const currentPhase = getPhase();

    // Compute focus score
    const focusScore = (() => {
      const relevantProjects = projects.filter((p) => p.status === "active");
      if (relevantProjects.length === 0) return 0;
      if (relevantProjects.length === 1) return 85;
      if (relevantProjects.length <= 2) return 65;
      return 40;
    })();

    // Generate insights
    const insights: any[] = [];

    // Stale projects alert
    const staleProjects = projects.filter((p) => {
      const days = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return days > 30;
    });
    if (staleProjects.length > 0) {
      insights.push({
        id: "stale-projects",
        category: "alert",
        title: `${staleProjects.length} stale project(s) detected`,
        description: `${staleProjects.map((p) => p.name).join(", ")} haven't been updated in 30+ days`,
        actionable: true,
        urgency: "high",
        relatedItems: { projectIds: staleProjects.map((p) => p.id) },
      });
    }

    // Task overload alert
    const pendingTasks = tasks.filter((t) => !t.completed);
    if (pendingTasks.length > 10) {
      insights.push({
        id: "task-backlog",
        category: "alert",
        title: `Task backlog building up (${pendingTasks.length} pending)`,
        description: "Consider prioritizing or deferring low-priority tasks to reduce cognitive load",
        actionable: true,
        urgency: "medium",
        relatedItems: { taskIds: pendingTasks.map((t) => t.id) },
      });
    }

    // Opportunity: Complete quick wins
    const quickWins = pendingTasks.filter(
      (t) =>
        (!t.dueDate || new Date(t.dueDate) > new Date()) &&
        t.priority !== "high"
    );
    if (quickWins.length > 0) {
      insights.push({
        id: "quick-wins",
        category: "opportunity",
        title: "Quick wins available",
        description: `${Math.min(3, quickWins.length)} low-priority tasks can be completed quickly for momentum`,
        actionable: true,
        urgency: "low",
        relatedItems: { taskIds: quickWins.slice(0, 3).map((t) => t.id) },
      });
    }

    // Context: Active projects
    if (activeProjects > 0) {
      insights.push({
        id: "context-focus",
        category: "context",
        title: `Focused on ${activeProjects} active project(s)`,
        description: `Current session phase: ${currentPhase}`,
        actionable: false,
        urgency: "low",
      });
    }

    // Momentum: Commit streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentlyUpdatedProjects = projects.filter((p) => {
      const projectDate = new Date(p.updatedAt);
      projectDate.setHours(0, 0, 0, 0);
      return projectDate.getTime() === today.getTime();
    });

    if (recentlyUpdatedProjects.length > 0) {
      insights.push({
        id: "momentum",
        category: "momentum",
        title: "Shipping momentum active today",
        description: `${recentlyUpdatedProjects.length} project(s) updated - keep the streak going!`,
        actionable: false,
        urgency: "low",
      });
    }

    // Estimate velocity
    const completedThisWeek = tasks.filter((t) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return t.completed && new Date(t.updatedAt) > weekAgo;
    }).length;
    const estimatedVelocity = Math.round(completedThisWeek / 7);

    // Compute code commit streak from timeline
    let codeCommitStreak = 0;
    const timelineRes = await fetch("http://localhost:3000/api/system/timeline");
    if (timelineRes.ok) {
      const timelineData = await timelineRes.json();
      codeCommitStreak = timelineData.weeklyReview?.commitStreak || 0;
    }

    // Recommendations
    const recommendations: any = {
      riskFlags: [],
    };

    if (staleProjects.length > 0) {
      recommendations.nextAction = `Review and update ${staleProjects[0].name}`;
    } else if (pendingTasks.length > 0) {
      recommendations.nextAction = `Start with: ${pendingTasks[0].title}`;
    }

    if (focusScore > 70) {
      recommendations.focusRecommendation =
        "Single-project focus detected - maintain flow state";
    } else if (focusScore < 40) {
      recommendations.focusRecommendation =
        "Multi-project context - consider time-boxing sessions";
      recommendations.riskFlags.push("Context switching overhead");
    }

    if (currentPhase === "active-coding") {
      recommendations.focusRecommendation = "Deep work session detected - minimize interruptions";
    }

    return NextResponse.json({
      insights,
      context: {
        currentPhase,
        primaryFocus:
          activeProjects > 0
            ? {
                projectId: projects.find((p) => p.status === "active")?.id || "",
                projectName: projects.find((p) => p.status === "active")?.name || "",
              }
            : undefined,
        focusScore,
        contextSwitchCount: projects.filter((p) => p.status === "active").length,
        estimatedProductivity: focusScore,
        stateMetadata: {
          lastActiveProject: projects[0]?.name,
          sessionDuration: Math.round(Math.random() * 120),
          interruptionCount: 0,
        },
      },
      recommendations,
      systemHealth: {
        activeProjects,
        completedTodayTasks,
        capturedNotes,
        codeCommitStreak,
        estimatedVelocity,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
