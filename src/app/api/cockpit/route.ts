import { streamText, createTextStreamResponse } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { decrypt } from "@/lib/encryption";
import { agentFetch } from "@/lib/agentFetch";


export const dynamic = "force-dynamic";

interface CockpitRequest {
  query: string;
  screenshot?: string;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const userName = session.user.name || "Kavya";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { groqApiKey: true, openrouterApiKey: true }
    });

    const decryptedGroq = user?.groqApiKey ? decrypt(user.groqApiKey) : "";
    const decryptedOpenrouter = user?.openrouterApiKey ? decrypt(user.openrouterApiKey) : "";

    const body: CockpitRequest = await request.json();
    const { query, screenshot } = body;

    if (!query?.trim()) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    const q = query.toLowerCase();

    // -- INTENT: DESIGN REVIEW --
    if (q.startsWith("review design")) {
      if (!screenshot) {
        return Response.json({
          response: "Design review requires an Electron screen capture. Please run DevOS as a desktop app."
        });
      }

      let visionModel = null;
      if (decryptedGroq) {
        const groqClient = createOpenAI({
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: decryptedGroq,
        });
        visionModel = groqClient("llama-3.2-11b-vision-preview");
      } else if (decryptedOpenrouter) {
        const openrouterClient = createOpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: decryptedOpenrouter,
        });
        visionModel = openrouterClient("google/gemini-2.0-flash");
      }

      if (!visionModel) {
        return Response.json({ error: "Please configure your Groq or OpenRouter API keys in Settings for vision support." }, { status: 500 });
      }

      const imgUrl = screenshot.startsWith("data:") ? screenshot : `data:image/jpeg;base64,${screenshot}`;

      const result = streamText({
        model: visionModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "You are the DevOS Design Review Assistant. Critique this design layout carefully. Analyze margins, color harmony, typography sizes, alignments, and visual hierarchy. List up to 3 dense, concrete, actionable visual styling recommendations for Kavya. Keep the response concise, constructive, and under 400 tokens." },
              { type: "image", image: imgUrl }
            ]
          }
        ],
        maxOutputTokens: 400,
      });

      return createTextStreamResponse({ textStream: result.textStream });
    }

    // -- INTENT: CODE REVIEW --
    if (q.startsWith("review code")) {
      const topic = query.replace(/^review code\s*/i, "").trim();
      if (!topic) {
        return Response.json({
          response: "Please specify a file name or search topic to review. Example: 'review code FocusPanelWidget'"
        });
      }

      // Fetch file content from the local agent
      let files = [];
      let agentError = "";
      try {
        const agentRes = await agentFetch(`/read-files?topic=${encodeURIComponent(topic)}`);
        if (agentRes.ok) {
          const data = await agentRes.json();
          files = data.files || [];
          agentError = data.error || "";
        } else {
          agentError = `Agent returned status ${agentRes.status}`;
        }
      } catch (err: any) {
        agentError = `Could not connect to local Express agent: ${err.message}`;
      }

      if (files.length === 0) {
        return Response.json({
          response: `Code review failed:\n${agentError || "No matching files found."}`
        });
      }

      // Read Claude.md/Agents.md guidelines from project root
      let codingRules = "";
      try {
        const fs = require("fs");
        const path = require("path");
        const rulesPath = path.join(process.cwd(), "Claude.md");
        if (fs.existsSync(rulesPath)) {
          codingRules = fs.readFileSync(rulesPath, "utf8").substring(0, 3000); // grab first 3kb
        }
      } catch (e) {}

      let modelInstance = null;
      if (decryptedGroq) {
        const groqClient = createOpenAI({
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: decryptedGroq,
        });
        modelInstance = groqClient("llama-3.3-70b-versatile");
      } else if (decryptedOpenrouter) {
        const openrouterClient = createOpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: decryptedOpenrouter,
        });
        modelInstance = openrouterClient("google/gemma-4-26b-a4b-it:free");
      }

      if (!modelInstance) {
        return Response.json({ error: "Please configure your Groq or OpenRouter API keys in Settings." }, { status: 500 });
      }

      const filesContent = files.map((f: any) => `### FILE: ${f.path}\n\`\`\`typescript\n${f.content}\n\`\`\`${f.truncated ? "\n[... truncated ...]" : ""}`).join("\n\n");

      const prompt = `You are a Senior React/Next.js/TypeScript Engineer auditing code for DevOS.
Auditee: Kavya (student developer building her personal OS).
Task: Critique the code below based on the coding standards in Claude.md (if provided). Focus on bug risks, React state anti-patterns, style guide violations, and tailwind/styling issues.
Guidelines:
- Be dense, direct, and actionable. No polite intros/outros ("Overall looks good", etc.). Start directly with findings.
- Recommend concrete lines/fixes.
- Limit review to 400 tokens.

CODENAME ARCHITECTURE RULES (CLAUDE.MD snippet):
${codingRules || "None provided. Use standard Next.js, React 19, and TailwindCSS rules."}

CODE FOR AUDIT:
${filesContent}

Provide the audit review:`;

      const result = streamText({
        model: modelInstance,
        system: "You are a direct, concise AI code auditor. You do not praise or offer empty compliments. You only identify issues and specify concrete fixes.",
        prompt,
        maxOutputTokens: 400,
      });

      return createTextStreamResponse({ textStream: result.textStream });
    }

    // 1. FRESH DB PULL FOR EACH REQUEST
    const [dbProjects, dbTasks, notes, commits] = await Promise.all([
      prisma.project.findMany({ where: { userId }, include: { links: true }, take: 20 }),
      prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.commit.findMany({
        where: {
          project: { userId },
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
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
    if (decryptedGroq) {
      const groqClient = createOpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: decryptedGroq,
      });
      modelInstance = groqClient("llama-3.3-70b-versatile");
    } else if (decryptedOpenrouter) {
      const openrouterClient = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: decryptedOpenrouter,
      });
      modelInstance = openrouterClient("google/gemma-4-26b-a4b-it:free");
    }

    if (!modelInstance) {
      return Response.json({ error: "Please configure your Groq or OpenRouter API keys in Settings to enable AI responses." }, { status: 500 });
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
    const systemPrompt = `You are the AI brain of DevOS — ${userName}'s personal developer operating system.
${userName} is a developer, building multiple projects simultaneously.
You have live access to their workspace data. Be specific, direct, and actionable.
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
