import { streamText, createTextStreamResponse } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import prisma from "@/lib/prisma";

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

    const lowerQuery = query.toLowerCase();

    // 1. SMART ROUTING: Stale Projects (Direct DB bypass without AI)
    if (lowerQuery.includes("stale")) {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const staleProjects = await prisma.project.findMany({ 
        where: { updatedAt: { lt: cutoff }, status: { not: "completed" } } 
      });
      
      if (staleProjects.length === 0) {
        return new Response("No stale projects! Everything has been touched recently.", { headers: { "Content-Type": "text/plain" } });
      }
      
      const responseText = staleProjects.map(p => {
        const days = Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        return `• ${p.name} (Stale for ${days} days)`;
      }).join("\n");
      
      return new Response(`Here are your stale projects:\n\n${responseText}`, { headers: { "Content-Type": "text/plain" } });
    }

    let modelInstance = null;
    
    if (process.env.GROQ_API_KEY) {
      modelInstance = groq("llama-3.3-70b-versatile");
    } else if (process.env.OPENROUTER_API_KEY) {
      modelInstance = openrouter("google/gemma-4-26b-a4b-it:free");
    }

    if (!modelInstance) {
      return Response.json({ error: "Please configure your OPENROUTER_API_KEY or GROQ_API_KEY in .env to enable AI answers." }, { status: 500 });
    }

    // 2. FETCH LIVE CONTEXT
    const projects = await prisma.project.findMany();
    const staleCount = projects.filter(p => p.updatedAt < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)).length;
    const tasks = await prisma.task.findMany({ where: { completed: false }, orderBy: { createdAt: 'desc' }, take: 20 });
    const notes = await prisma.note.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });

    // 3. SMART ROUTING MODIFIERS
    let additionalInstructions = "";
    let filteredProjects = projects;
    let filteredTasks = tasks;
    let filteredNotes = notes;

    if (lowerQuery.includes("work on") || lowerQuery.includes("focus")) {
      additionalInstructions = "\nCRITICAL INSTRUCTION: The user is asking what to focus on. Pick EXACTLY ONE project and ONE task from the context below and explain briefly why she should work on it.";
    } else if (lowerQuery.includes("summarize")) {
      const targetProject = projects.find(p => lowerQuery.includes(p.name.toLowerCase()));
      if (targetProject) {
        filteredProjects = [targetProject];
        filteredTasks = tasks.filter(t => t.projectId === targetProject.id && !t.completed);
        filteredNotes = notes;
        additionalInstructions = `\nCRITICAL INSTRUCTION: Summarize the project "${targetProject.name}" based on its tasks and data.`;
      }
    }

    // 4. BUILD PROMPT
    const systemPrompt = `You are Kavya's personal dev OS assistant. You have access to her live workspace data. Be direct, specific, and actionable. Never be generic. Reference actual project names, task names, and dates.
${additionalInstructions}

LIVE CONTEXT:
Projects (${filteredProjects.length} total, ${staleCount} stale):
${filteredProjects.map(p => `- ${p.name} [${p.status}] last updated ${new Date(p.updatedAt).toISOString().split('T')[0]} | tasks: ${tasks.filter(t=>!t.completed && t.projectId === p.id).length} open`).join('\n')}

Open tasks (${filteredTasks.length}):
${filteredTasks.map(t => `- ${t.title} [${t.priority}] due: ${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'no date'}`).join('\n')}

Recent notes:
${filteredNotes.map(n => `- ${n.content.slice(0,80)}`).join('\n')}

Today is ${new Date().toDateString()}.`;

    // 5. CALL AI
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
