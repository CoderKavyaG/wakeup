import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. Fetch all raw datasets from DB
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });

    const notes = await prisma.note.findMany({
      where: {
        userId,
        NOT: {
          source: {
            in: ["cockpit_helpful", "cockpit_unhelpful"]
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const caches = await prisma.githubCache.findMany({
      where: { userId }
    });

    const timelineEvents: any[] = [];

    // 2. Add Project registrations to timeline
    projects.forEach((p) => {
      timelineEvents.push({
        id: `event-proj-${p.id}`,
        type: "project",
        title: `Project Registered: ${p.name}`,
        description: p.description || "Added to registered portfolio",
        date: p.createdAt.toISOString(),
        metadata: { status: p.status, techStack: p.techStack }
      });
    });

    // 3. Add Task creation & completions to timeline
    tasks.forEach((t) => {
      // Creation
      timelineEvents.push({
        id: `event-task-create-${t.id}`,
        type: "task-created",
        title: `Task Drafted: ${t.title}`,
        description: `Priority set to ${t.priority}`,
        date: t.createdAt.toISOString(),
        metadata: { priority: t.priority }
      });

      // Completion
      if (t.completed) {
        timelineEvents.push({
          id: `event-task-complete-${t.id}`,
          type: "task-completed",
          title: `Task Completed: ${t.title}`,
          description: `Marked done successfully`,
          date: t.updatedAt.toISOString(),
          metadata: { priority: t.priority }
        });
      }
    });

    // 4. Add Notes to timeline
    notes.forEach((n) => {
      timelineEvents.push({
        id: `event-note-${n.id}`,
        type: "note",
        title: "Brain Dump Logged",
        description: n.content,
        date: n.createdAt.toISOString(),
      });
    });

    // 5. Add Commit pushes from cache if available
    const allCommits: any[] = [];
    caches.forEach((cache: any) => {
      const data = cache.data as any;
      if (data && Array.isArray(data.commits)) {
        allCommits.push(...data.commits);
        data.commits.forEach((c: any) => {
          timelineEvents.push({
            id: `event-commit-${c.sha}`,
            type: "commit",
            title: `Commit: [${c.repoName}] ${c.message}`,
            description: `SHA: ${c.sha}`,
            date: c.date || new Date().toISOString(),
            metadata: { url: c.url }
          });
        });
      }
    });

    // Sort timeline chronologically (newest first)
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 6. Calculate Weekly Review Statistics (past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const commitsLast7Days = allCommits.filter((c: any) => new Date(c.date) >= sevenDaysAgo).length;
    const completedTasksLast7Days = tasks.filter((t) => t.completed && t.updatedAt >= sevenDaysAgo).length;
    const activeProjectsCount = projects.filter((p) => p.status === "active").length;
    const staleProjectsCount = projects.filter((p) => p.status === "stale").length;

    // Calculate momentum trends
    let totalMomentum = 0;
    projects.forEach((p) => {
      totalMomentum += p.momentumScore || 0;
    });

    const averageProjectHealth = projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.projectHealth || 100), 0) / projects.length)
      : 100;

    // Generate smart weekly feedback summary card message
    let feedbackSummary = "";
    if (commitsLast7Days > 5 || completedTasksLast7Days > 3) {
      feedbackSummary = "🚀 Stellar shipping week! Excellent velocity, high commit frequency, and strong task completion streak. Keep maintaining this exact momentum.";
    } else if (commitsLast7Days > 0 || completedTasksLast7Days > 0) {
      feedbackSummary = "⚡ Decent progress. You maintained solid micro-steps, but there's room to increase your commit rhythm and clear stale backlogs.";
    } else {
      feedbackSummary = "⚠️ Momentum alert. High count of pending tasks and stagnant code repositories. Block out 1 hour for deep work focus to unlock progress.";
    }

    return NextResponse.json({
      weeklyReview: {
        commitsPushed: commitsLast7Days,
        tasksCompleted: completedTasksLast7Days,
        activeProjects: activeProjectsCount,
        staleProjects: staleProjectsCount,
        totalMomentum,
        averageProjectHealth,
        feedbackSummary,
        calculatedAt: new Date().toISOString()
      },
      timeline: timelineEvents.slice(0, 30) // Return top 30 events for high fidelity scroll
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
