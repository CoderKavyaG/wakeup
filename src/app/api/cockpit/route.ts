import { streamText, createTextStreamResponse } from "ai";
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

interface CockpitRequest {
  query: string;
}

export async function POST(request: Request) {
  try {
    const body: CockpitRequest = await request.json();
    const { query } = body;

    if (!query?.trim()) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. FRESH DB PULL FOR EACH REQUEST
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

    // Map DB fields to prompt requirements in memory
    const projects = dbProjects.map(p => ({
      ...p,
      health: p.projectHealth,
      tasks: dbTasks.filter(t => t.projectId === p.id)
    }));

    const tasks = dbTasks.filter(t => !t.completed).slice(0, 30);

    // 2. COMPUTE DERIVED SIGNALS
    const now = Date.now();
    const stale = projects.filter(p => (now - new Date(p.updatedAt).getTime()) > 14 * 86400000);
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
    const todayTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    });

    // 3. SMART INTENT ROUTING (Direct DB bypass before AI)
    const q = query.toLowerCase();

    if (q.includes('stale')) {
      const list = stale.map(p => `${p.name} — ${Math.floor((now - new Date(p.updatedAt).getTime())/86400000)}d ago`).join('\n');
      const responseMsg = stale.length === 0 ? 'All projects are active.' : `${stale.length} stale projects:\n${list}`;
      return Response.json({ response: responseMsg, result: responseMsg });
    }

    if (q.includes('overdue')) {
      const list = overdue.map(t => `"${t.title}" — due ${new Date(t.dueDate!).toLocaleDateString()}`).join('\n');
      const responseMsg = overdue.length === 0 ? 'No overdue tasks.' : `${overdue.length} overdue:\n${list}`;
      return Response.json({ response: responseMsg, result: responseMsg });
    }

    if (q.includes('today') && (q.includes('task') || q.includes('do'))) {
      const list = todayTasks.map(t => `"${t.title}" [${t.priority}]`).join('\n');
      const responseMsg = todayTasks.length === 0 ? 'No tasks due today.' : `Today's tasks:\n${list}`;
      return Response.json({ response: responseMsg, result: responseMsg });
    }

    // 4. CHOOSE MODEL AND VERIFY CONFIGURATION
    let modelInstance = null;
    if (process.env.GROQ_API_KEY) {
      modelInstance = groq("llama-3.3-70b-versatile");
    } else if (process.env.OPENROUTER_API_KEY) {
      modelInstance = openrouter("google/gemma-4-26b-a4b-it:free");
    }

    if (!modelInstance) {
      return Response.json({ error: "Please configure your OPENROUTER_API_KEY or GROQ_API_KEY in .env to enable AI answers." }, { status: 500 });
    }

    // 5. COMMIT SUMMARY GROUPED BY REPO
    const byRepo = commits.reduce((acc, c) => {
      acc[c.repoName] = acc[c.repoName] || [];
      acc[c.repoName].push(c.message);
      return acc;
    }, {} as Record<string, string[]>);

    const commitSummary = Object.entries(byRepo)
      .map(([repo, msgs]) => `  ${repo} (${msgs.length} commits): ${msgs.slice(0,3).join(' | ')}`)
      .join('\n');

    // 6. BUILD FRESH CONTEXT SYSTEM PROMPT
    const systemPrompt = `You are the AI brain of DevOS — Kavya's personal developer operating system.
Kavya is a student developer based in India, building multiple projects simultaneously.
You have live access to her workspace data. Be specific, direct, and actionable.
Never give generic advice. Always reference actual project names, task titles, or commit messages.
Keep answers under 120 words unless asked for detail. No bullet points unless listing >3 items.

LIVE WORKSPACE DATA:
Projects (${projects.length} total, ${stale.length} stale):
${projects.map(p => `  ${p.name} [${p.status}] health:${p.health ?? 'unknown'} tasks:${p.tasks.filter(t=>!t.completed).length} open`).join('\n')}

Stale projects (no activity >14d): ${stale.map(p=>p.name).join(', ') || 'none'}

Open tasks (${tasks.length} total, ${overdue.length} overdue, ${todayTasks.length} due today):
${tasks.slice(0,10).map(t => `  "${t.title}" [${t.priority}]${t.dueDate ? ` due ${new Date(t.dueDate).toLocaleDateString()}` : ''}`).join('\n')}

This week's commits (${commits.length} total):
${commitSummary || '  No recent commits'}

Recent brain dump:
${notes.slice(0,5).map(n => `  "${n.content.slice(0,60)}"`).join('\n') || '  Empty'}

Today is ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}.`;

    // 7. CALL AI MODEL AND STREAM TEXT RESPONSE
    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      prompt: query,
      maxOutputTokens: 500,
    });

    return createTextStreamResponse({ textStream: result.textStream });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cockpit error";
    console.error("[/api/cockpit]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
