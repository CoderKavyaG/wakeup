import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Since Project does not have a direct tasks relation in the schema, we query it separately.
    const [project, tasks] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          links: true,
          commits: { orderBy: { date: 'desc' }, take: 1 }
        }
      }),
      prisma.task.findMany({
        where: { projectId }
      })
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let score = 100;
    const signals: string[] = [];

    // Signal 1: last commit age
    const lastCommit = project.commits[0];
    if (lastCommit) {
      const daysAgo = (Date.now() - new Date(lastCommit.date).getTime()) / 86400000;
      if (daysAgo > 30) {
        score -= 30;
        signals.push(`no commit in ${Math.floor(daysAgo)}d`);
      } else if (daysAgo > 14) {
        score -= 15;
        signals.push(`last commit ${Math.floor(daysAgo)}d ago`);
      } else if (daysAgo > 7) {
        score -= 5;
      }
    } else if (project.githubUrl) {
      score -= 20;
      signals.push("no commits fetched yet");
    }

    // Signal 2: overdue tasks
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
    if (overdueTasks.length > 0) {
      score -= Math.min(overdueTasks.length * 8, 25);
      signals.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`);
    }

    // Signal 3: infrastructure link health (from last ping results)
    const downLinks = project.links.filter(l => l.lastStatus && (l.lastStatus < 200 || l.lastStatus >= 400));
    if (downLinks.length > 0) {
      score -= downLinks.length * 15;
      signals.push(`${downLinks.length} link${downLinks.length > 1 ? 's' : ''} down`);
    }

    // Signal 4: has any content at all
    if (!project.description || project.description.length < 10) {
      score -= 5;
    }
    if (!project.githubUrl && !project.folderPath) {
      score -= 10;
      signals.push("no repo or folder linked");
    }

    score = Math.max(0, Math.min(100, score));

    // Save to DB
    await prisma.project.update({
      where: { id: projectId },
      data: {
        health: score,
        healthSignals: JSON.stringify(signals)
      }
    });

    return NextResponse.json({ score, signals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health calculation error";
    console.error("[/api/projects/health] POST Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
