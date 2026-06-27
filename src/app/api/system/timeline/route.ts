import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [projects, tasks, notes, caches, user, telegramLink, ideas] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      }),
      prisma.task.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.note.findMany({
        where: {
          userId,
          NOT: {
            source: {
              in: ["cockpit_helpful", "cockpit_unhelpful"]
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.githubCache.findMany({
        where: { userId }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { githubToken: true, vercelToken: true }
      }),
      prisma.telegramLink.findUnique({
        where: { userId }
      }),
      prisma.idea.findMany({
        where: { userId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const timelineEvents: any[] = [];

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

    tasks.forEach((t) => {
      const projectName = t.projectId ? projectMap.get(t.projectId) : null;
      timelineEvents.push({
        id: `event-task-create-${t.id}`,
        type: "task-created",
        title: `Task Drafted: ${t.title}`,
        description: projectName ? `Project: ${projectName} | Priority: ${t.priority}` : `Priority: ${t.priority}`,
        date: t.createdAt.toISOString(),
        metadata: { priority: t.priority, source: t.source, projectId: t.projectId, projectName }
      });

      if (t.completed) {
        timelineEvents.push({
          id: `event-task-complete-${t.id}`,
          type: "task-completed",
          title: `Task Completed: ${t.title}`,
          description: projectName ? `Project: ${projectName} | Completed successfully` : "Completed successfully",
          date: t.updatedAt.toISOString(),
          metadata: { priority: t.priority, source: t.source, projectId: t.projectId, projectName }
        });
      }
    });

    notes.forEach((n) => {
      const projectName = n.projectId ? projectMap.get(n.projectId) : null;
      timelineEvents.push({
        id: `event-note-${n.id}`,
        type: "note",
        title: projectName ? `Note Added: ${projectName}` : "Brain Dump Logged",
        description: n.content,
        date: n.createdAt.toISOString(),
        metadata: { source: n.source, projectId: n.projectId, projectName }
      });
    });

    ideas.forEach((idea) => {
      const projectName = idea.project?.name ?? (idea.projectId ? projectMap.get(idea.projectId) : null);
      timelineEvents.push({
        id: `event-idea-${idea.id}`,
        type: "idea",
        title: projectName ? `Idea for ${projectName}` : "Global Idea Captured",
        description: idea.content,
        date: idea.createdAt.toISOString(),
        metadata: { source: idea.source, status: idea.status, projectId: idea.projectId, projectName }
      });
    });

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
            description: `SHA: ${c.sha.slice(0, 7)}`,
            date: c.date || new Date().toISOString(),
            metadata: { url: c.url }
          });
        });
      }
    });

    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const commitsLast7Days = allCommits.filter((c: any) => new Date(c.date) >= sevenDaysAgo).length;
    const completedTasksLast7Days = tasks.filter((t) => t.completed && t.updatedAt >= sevenDaysAgo).length;
    const activeProjectsCount = projects.filter((p) => p.status === "active").length;
    const staleProjectsCount = projects.filter((p) => p.status === "stale").length;

    let totalMomentum = 0;
    projects.forEach((p) => {
      totalMomentum += p.momentumScore || 0;
    });

    const averageProjectHealth = projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.projectHealth || 100), 0) / projects.length)
      : 100;

    let feedbackSummary = "";
    if (commitsLast7Days > 5 || completedTasksLast7Days > 3) {
      feedbackSummary = "🚀 Stellar shipping week! Excellent velocity, high commit frequency, and strong task completion streak. Keep maintaining this exact momentum.";
    } else if (commitsLast7Days > 0 || completedTasksLast7Days > 0) {
      feedbackSummary = "⚡ Decent progress. You maintained solid micro-steps, but there's room to increase your commit rhythm and clear stale backlogs.";
    } else {
      feedbackSummary = "⚠️ Momentum alert. High count of pending tasks and stagnant repositories. Block out 1 hour for deep work focus to unlock progress.";
    }

    const diagnostics: any[] = [];
    if (!user?.githubToken) {
      diagnostics.push({
        id: "github",
        message: "GitHub Integration: Token missing. Local commit monitoring is inactive."
      });
    }
    if (!user?.vercelToken) {
      diagnostics.push({
        id: "vercel",
        message: "Vercel Integration: Token missing. Deployment tracking is disabled."
      });
    }
    if (!telegramLink) {
      diagnostics.push({
        id: "telegram",
        message: `Telegram Bot: Unlinked. Use code DEVOS-${userId.slice(0, 8)} in @AssistmeOs_Bot to link your phone.`
      });
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
      timeline: timelineEvents.slice(0, 30),
      diagnostics
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
