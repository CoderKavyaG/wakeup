import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. DATA PULL
    const [dbProjects, dbTasks, notes, commits] = await Promise.all([
      prisma.project.findMany({ include: { links: true }, take: 20 }),
      prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.note.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.commit.findMany({
        where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { date: 'desc' },
        take: 50
      })
    ]);

    // Map DB fields to projects structure
    const projects = dbProjects.map(p => ({
      ...p,
      health: p.projectHealth,
      tasks: dbTasks.filter(t => t.projectId === p.id)
    }));

    const tasks = dbTasks.filter(t => !t.completed).slice(0, 30);

    // Compute derived signals
    const now = Date.now();
    const staleProjects = projects.filter(p => (now - new Date(p.updatedAt).getTime()) > 14 * 86400000);
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
    const todayTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    });

    const byRepo = commits.reduce((acc, c) => {
      acc[c.repoName] = acc[c.repoName] || [];
      acc[c.repoName].push(c.message);
      return acc;
    }, {} as Record<string, string[]>);

    const commitSummary = Object.entries(byRepo)
      .map(([repo, msgs]) => `  ${repo} (${msgs.length} commits): ${msgs.slice(0,3).join(' | ')}`)
      .join('\n');

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tonight = new Date(Date.now() + 12 * 60 * 60 * 1000);

    // 2. GENERATE AND STORE INSIGHTS
    // 2.1 Stale warnings
    for (const p of staleProjects) {
      const daysStale = Math.floor((now - new Date(p.updatedAt).getTime()) / 86400000);
      const content = `${p.name} hasn't had a commit in ${daysStale}d`;
      await prisma.aIInsight.upsert({
        where: { id: `stale-${p.id}` },
        update: { content, expiresAt: tomorrow, read: false },
        create: { id: `stale-${p.id}`, type: 'stale_warning', content, expiresAt: tomorrow }
      });
    }

    // 2.2 Overdue task summary
    if (overdue.length > 0) {
      const content = `${overdue.length} overdue: ${overdue.slice(0,2).map(t=>t.title).join(', ')}`;
      await prisma.aIInsight.upsert({
        where: { id: 'overdue-summary' },
        update: { content, expiresAt: tonight, read: false },
        create: { id: 'overdue-summary', type: 'overdue', content, expiresAt: tonight }
      });
    }

    // 2.3 AI daily brief
    let modelInstance = null;
    if (process.env.GROQ_API_KEY) {
      modelInstance = groq("llama-3.3-70b-versatile");
    } else if (process.env.OPENROUTER_API_KEY) {
      modelInstance = openrouter("google/gemma-4-26b-a4b-it:free");
    }

    const systemPrompt = `You are the AI brain of DevOS — Kavya's personal developer operating system.
Kavya is a student developer based in India, building multiple projects simultaneously.
You have live access to her workspace data. Be specific, direct, and actionable.
Write ONE sentence telling Kavya what to focus on today. Name a project or task explicitly.
Keep your response short, direct, and under 25 words. No greetings or headers.`;

    let brief = "Focus on completing your highest priority tasks today.";

    if (modelInstance) {
      try {
        const response = await generateText({
          model: modelInstance,
          system: systemPrompt,
          prompt: `Stale: ${staleProjects.map(p=>p.name).join(', ')||'none'}
Overdue tasks: ${overdue.map(t=>t.title).join(', ')||'none'}
Today's tasks: ${todayTasks.map(t=>t.title).join(', ')||'none'}
Recent commits: ${commitSummary}

Write ONE sentence telling Kavya what to focus on today. Be specific. Name a project or task.`,
        });
        brief = response.text.trim().replace(/^"(.*)"$/, '$1'); // Strip quotes if any
      } catch (err) {
        console.error("Failed to generate daily brief via AI", err);
      }
    }

    await prisma.aIInsight.upsert({
      where: { id: 'daily-brief' },
      update: { content: brief, read: false, expiresAt: tomorrow },
      create: { id: 'daily-brief', type: 'daily_brief', content: brief, expiresAt: tomorrow }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intelligence generation error";
    console.error("[/api/intelligence] POST Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const insights = await prisma.aIInsight.findMany({
      where: {
        read: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(insights);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intelligence fetch error";
    console.error("[/api/intelligence] GET Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
