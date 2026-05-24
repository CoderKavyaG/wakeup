import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createTextStreamResponse } from "ai";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CockpitRequest {
  query: string;
  context?: {
    projects?: { name: string; status: string; tags: string[]; nextAction?: string | null }[];
    tasks?: { title: string; priority: string; completed: boolean }[];
    notes?: { content: string }[];
  };
}

export async function POST(request: Request) {
  try {
    const body: CockpitRequest = await request.json();
    const { query, context } = body;

    if (!query?.trim()) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    // If no API key, fall back to fast DB-only response
    if (!process.env.OPENAI_API_KEY) {
      const result = await handleNoAIFallback(query);
      return Response.json({ result, fallback: true });
    }

    // Build context summary from whatever we received (or fetch fresh from DB)
    let projectsSummary = "";
    let tasksSummary = "";
    let notesSummary = "";

    if (context?.projects && context.projects.length > 0) {
      projectsSummary = context.projects
        .map((p) => `- ${p.name} [${p.status}]${p.tags.length ? ` (${p.tags.slice(0, 3).join(", ")})` : ""}${p.nextAction ? ` → next: ${p.nextAction}` : ""}`)
        .join("\n");
    } else {
      const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 10 });
      projectsSummary = projects
        .map((p) => `- ${p.name} [${p.status}]${p.nextAction ? ` → next: ${p.nextAction}` : ""}`)
        .join("\n");
    }

    if (context?.tasks && context.tasks.length > 0) {
      const open = context.tasks.filter((t) => !t.completed);
      tasksSummary = open
        .slice(0, 8)
        .map((t) => `- [${t.priority}] ${t.title}`)
        .join("\n");
    } else {
      const tasks = await prisma.task.findMany({ where: { completed: false }, orderBy: { priority: "desc" }, take: 8 });
      tasksSummary = tasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n");
    }

    if (context?.notes && context.notes.length > 0) {
      notesSummary = context.notes
        .slice(0, 5)
        .map((n) => `- ${n.content.substring(0, 80)}`)
        .join("\n");
    } else {
      const notes = await prisma.note.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
      notesSummary = notes.map((n) => `- ${n.content.substring(0, 80)}`).join("\n");
    }

    const systemPrompt = `You are Kavya's personal developer OS assistant inside DevOS, her second brain and agentic dashboard.

You have full access to her live data:

PROJECTS:
${projectsSummary || "No projects yet."}

OPEN TASKS:
${tasksSummary || "No open tasks."}

RECENT NOTES:
${notesSummary || "No recent notes."}

Rules:
- Answer concisely and actionably. No fluff, no preamble.
- If asked what to work on, pick ONE thing and explain why briefly.
- If asked about stale projects, list them with days since last update if you can infer it.
- If the query is a command like "create task" or "add note", confirm what you would do (the UI handles actual creation).
- Speak directly to Kavya in second person.
- Keep responses under 150 words unless a detailed breakdown is explicitly asked for.`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: query,
      maxOutputTokens: 300,
    });

    return createTextStreamResponse({ textStream: result.textStream });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cockpit error";
    console.error("[/api/cockpit]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

// Fallback when no OpenAI key — pure DB logic
async function handleNoAIFallback(query: string): Promise<string> {
  const lower = query.toLowerCase();

  if (lower.includes("work on") || lower.includes("focus") || lower.includes("what should")) {
    const project = await prisma.project.findFirst({ where: { status: "active" }, orderBy: { updatedAt: "desc" } });
    const task = await prisma.task.findFirst({ where: { completed: false }, orderBy: { priority: "desc" } });
    return `Focus on: ${project?.name ?? "No active project"}\nTop task: ${task?.title ?? "All clear"}`;
  }

  if (lower.includes("stale")) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stale = await prisma.project.findMany({ where: { updatedAt: { lt: cutoff }, status: { not: "completed" } }, take: 5 });
    if (stale.length === 0) return "No stale projects — great work!";
    return stale.map((p) => `• ${p.name}`).join("\n");
  }

  if (lower.includes("task") || lower.includes("todo")) {
    const tasks = await prisma.task.findMany({ where: { completed: false }, orderBy: { priority: "desc" }, take: 5 });
    if (tasks.length === 0) return "No open tasks!";
    return tasks.map((t) => `• [${t.priority}] ${t.title}`).join("\n");
  }

  return "Add your OPENAI_API_KEY to .env to enable AI answers. I can still answer basic data queries.";
}
