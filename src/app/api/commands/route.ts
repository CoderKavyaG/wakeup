import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import prisma from "@/lib/prisma";
import { generateEmbedding, cosineSimilarity } from "@/lib/embeddings";

interface CommandRequest {
  query: string;
}

// Map commands to system actions
const COMMAND_PATTERNS = {
  "what should i work on": "next_action",
  "show stale projects": "stale_projects",
  "summarize": "summarize_project",
  "generate resume": "resume_bullets",
  "what did i build": "weekly_summary",
  "why is velocity": "velocity_analysis",
};

async function identifyCommand(query: string): Promise<string> {
  const lower = query.toLowerCase();
  for (const [pattern, cmd] of Object.entries(COMMAND_PATTERNS)) {
    if (lower.includes(pattern)) return cmd;
  }
  return "semantic_search"; // Default fallback
}

async function handleNextAction(): Promise<string> {
  const projects = await prisma.project.findMany({
    where: { status: "active" },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  const tasks = await prisma.task.findMany({
    where: { completed: false },
    orderBy: { priority: "desc" },
    take: 3,
  });

  return `Focus on: ${projects[0]?.name || "No active projects"}\nNext task: ${tasks[0]?.title || "All done!"}`;
}

async function handleStaleProjects(): Promise<string> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const stale = await prisma.project.findMany({
    where: {
      updatedAt: { lt: thirtyDaysAgo },
      status: { not: "completed" },
    },
    orderBy: { updatedAt: "asc" },
    take: 5,
  });

  if (stale.length === 0) return "No stale projects—great work!";
  return `Stale projects:\n${stale.map((p) => `• ${p.name} (${Math.floor((Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days)`).join("\n")}`;
}

async function handleWeeklySummary(): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentNotes = await prisma.note.findMany({
    where: { createdAt: { gt: weekAgo } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const completedTasks = await prisma.task.findMany({
    where: {
      completed: true,
      updatedAt: { gt: weekAgo },
    },
    take: 10,
  });

  const summary = `
Completed tasks: ${completedTasks.length}
Recent notes: ${recentNotes.length}
${completedTasks.map((t) => `✓ ${t.title}`).join("\n")}
  `.trim();

  return summary;
}

async function handleSemanticSearch(query: string): Promise<string> {
  const embedding = await generateEmbedding(query);
  const memories = await prisma.memory.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const scored = memories
    .map((m) => ({
      memory: m,
      score: m.embedding && m.embedding.length > 0 ? cosineSimilarity(embedding, m.embedding) : 0,
    }))
    .filter((s) => s.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return "No relevant memories found.";
  return scored.map((s) => s.memory.content).join("\n---\n");
}

export async function POST(request: Request) {
  try {
    const { query }: CommandRequest = await request.json();

    if (!query.trim()) {
      return NextResponse.json({ result: "What can I help with?" });
    }

    const command = await identifyCommand(query);
    let result = "";

    switch (command) {
      case "next_action":
        result = await handleNextAction();
        break;
      case "stale_projects":
        result = await handleStaleProjects();
        break;
      case "weekly_summary":
        result = await handleWeeklySummary();
        break;
      case "semantic_search":
        result = await handleSemanticSearch(query);
        break;
      default:
        result = "Command not recognized.";
    }

    return NextResponse.json({
      result,
      command,
      query,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Command error";
    console.error("Command error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage, result: "" },
      { status: 500 }
    );
  }
}
