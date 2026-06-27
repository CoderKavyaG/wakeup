import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatIdeaOrNoteContent(content: string): string | null {
  try {
    if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
      const parsed = JSON.parse(content);
      if (parsed.type === "text") {
        return parsed.text && parsed.text.trim() ? parsed.text.trim() : null;
      }
      if (parsed.type === "voice") {
        return parsed.text && parsed.text.trim() ? `[Voice Note] ${parsed.text.trim()}` : null;
      }
      return parsed.text && parsed.text.trim() ? parsed.text.trim() : null;
    }
  } catch (e) {}
  return content.trim() ? content.trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const message = body.message;
    if (!message?.text) return Response.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text.startsWith("DEVOS-")) {
      const shortId = text.replace("DEVOS-", "").trim();
      let user = null;
      if (shortId.length >= 8) {
        user = await prisma.user.findFirst({
          where: { id: { startsWith: shortId } },
        });
      }
      if (user) {
        await prisma.telegramLink.upsert({
          where: { userId: user.id },
          update: { chatId: chatId.toString() },
          create: { chatId: chatId.toString(), userId: user.id },
        });
        await sendTelegramMessage(
          chatId,
          "✅ Telegram linked to DevOS! Now send me anything — tasks, ideas, notes — and I'll save it for you."
        );
      } else {
        await sendTelegramMessage(chatId, "❌ Invalid link code. Please check your DevOS settings.");
      }
      return Response.json({ ok: true });
    }

    const userId = await getUserIdFromChatId(chatId);
    if (!userId) {
      await sendTelegramMessage(
        chatId,
        "❌ This Telegram account isn't linked to a DevOS account. Send your linkage code (DEVOS-...) or link it in DevOS → Settings."
      );
      return Response.json({ ok: true });
    }

    const session = await prisma.telegramSession.findUnique({
      where: { chatId: chatId.toString() },
    });
    const isSessionActive = session && new Date(session.expiresAt) > new Date();

    if (text.startsWith("/")) {
      const parts = text.split(" ");
      const command = parts[0].toLowerCase();

      if (command === "/projects") {
        await sendTelegramMessage(
          chatId,
          `Select a phase to view its projects:\n\n/indevelopment — Projects in development\n/launched — Launched projects\n/sketching — Sketching & prototyping\n/inplanning — Ideas & planning`
        );
        return Response.json({ ok: true });
      }

      if (command === "/indevelopment" || command === "/launched" || command === "/sketching" || command === "/inplanning") {
        const phaseMap: Record<string, string> = {
          "/indevelopment": "in_development",
          "/launched": "launched",
          "/sketching": "sketching",
          "/inplanning": "idea"
        };
        const phaseLabelMap: Record<string, string> = {
          "/indevelopment": "In Development",
          "/launched": "Launched",
          "/sketching": "Sketching",
          "/inplanning": "In Planning"
        };
        const phaseDbValue = phaseMap[command];
        const projects = await prisma.project.findMany({
          where: {
            userId,
            phase: phaseDbValue,
            ...(command === "/inplanning" ? { status: "planning" } : {})
          },
          orderBy: { name: "asc" }
        });
        if (projects.length === 0) {
          await sendTelegramMessage(chatId, `No projects found in phase: ${phaseLabelMap[command]}.`);
          return Response.json({ ok: true });
        }
        const listStr = projects
          .map((p, idx) => `${idx + 1}. <b>${p.name}</b>`)
          .join("\n");
        await prisma.telegramSession.upsert({
          where: { chatId: chatId.toString() },
          update: {
            activeProjectId: `phase:${phaseDbValue}`,
            activeProjectName: "Awaiting Selection",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
          create: {
            chatId: chatId.toString(),
            activeProjectId: `phase:${phaseDbValue}`,
            activeProjectName: "Awaiting Selection",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });
        await sendTelegramMessage(
          chatId,
          `<b>Projects in ${phaseLabelMap[command]}:</b>\n\n${listStr}\n\nReply with the number to lock, or send /done to cancel.`
        );
        return Response.json({ ok: true });
      }

      if (command === "/done") {
        await prisma.telegramSession.deleteMany({
          where: { chatId: chatId.toString() },
        });
        await sendTelegramMessage(chatId, "🔓 Project lock cleared. Future captures will be global.");
        return Response.json({ ok: true });
      }

      if (command === "/clearideas") {
        await prisma.idea.deleteMany({
          where: { userId },
        });
        await sendTelegramMessage(chatId, "🗑️ Cleared all ideas from your database.");
        return Response.json({ ok: true });
      }

      if (command === "/today") {
        const todayStr = new Date().toISOString().split("T")[0];
        const tasks = await prisma.task.findMany({
          where: { userId, completed: false, dueDate: todayStr },
          orderBy: { createdAt: "desc" },
        });
        if (tasks.length === 0) {
          await sendTelegramMessage(chatId, "No tasks due today.");
          return Response.json({ ok: true });
        }
        const listStr = tasks.map((t, idx) => `${idx + 1}. [${t.priority}] ${escapeHtml(t.title)}`).join("\n");
        await sendTelegramMessage(chatId, `<b>Tasks due today:</b>\n\n${listStr}`);
        return Response.json({ ok: true });
      }

      if (command === "/ideas") {
        const ideas = await prisma.idea.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          include: { project: { select: { name: true } } },
        });
        const cleanIdeas = ideas
          .map((i) => {
            const cleanContent = formatIdeaOrNoteContent(i.content);
            return cleanContent ? { ...i, cleanContent } : null;
          })
          .filter((i): i is NonNullable<typeof i> => i !== null)
          .slice(0, 10);

        if (cleanIdeas.length === 0) {
          await sendTelegramMessage(chatId, "No ideas captured yet.");
          return Response.json({ ok: true });
        }
        const listStr = cleanIdeas
          .map((i, idx) => {
            const escaped = escapeHtml(i.cleanContent);
            return `${idx + 1}. "${escaped}"${i.project ? ` [${i.project.name}]` : ""}`;
          })
          .join("\n");
        await sendTelegramMessage(chatId, `<b>Recent Ideas:</b>\n\n${listStr}`);
        return Response.json({ ok: true });
      }

      if (command === "/notes") {
        const notes = await prisma.note.findMany({
          where: { userId, NOT: { source: { in: ["cockpit_helpful", "cockpit_unhelpful"] } } },
          orderBy: { createdAt: "desc" },
        });
        const cleanNotes = notes
          .map((n) => {
            const cleanContent = formatIdeaOrNoteContent(n.content);
            return cleanContent ? { ...n, cleanContent } : null;
          })
          .filter((n): n is NonNullable<typeof n> => n !== null)
          .slice(0, 5);

        if (cleanNotes.length === 0) {
          await sendTelegramMessage(chatId, "No notes captured yet.");
          return Response.json({ ok: true });
        }
        const listStr = cleanNotes
          .map((n, idx) => {
            const escaped = escapeHtml(n.cleanContent);
            return `${idx + 1}. "${escaped}"`;
          })
          .join("\n");
        await sendTelegramMessage(chatId, `<b>Recent Notes:</b>\n\n${listStr}`);
        return Response.json({ ok: true });
      }

      if (command === "/status") {
        const [openTasks, projectsCount, ideasCount, notesCount] = await Promise.all([
          prisma.task.count({ where: { userId, completed: false } }),
          prisma.project.count({ where: { userId } }),
          prisma.idea.count({ where: { userId } }),
          prisma.note.count({
            where: { userId, NOT: { source: { in: ["cockpit_helpful", "cockpit_unhelpful"] } } },
          }),
        ]);
        const statusLock = isSessionActive && session?.activeProjectName
          ? `Locked to: <b>${session.activeProjectName}</b>`
          : "Global mode";
        await sendTelegramMessage(
          chatId,
          `<b>DevOS Status Summary:</b>\n\nMode: ${statusLock}\nOpen Tasks: ${openTasks}\nProjects: ${projectsCount}\nIdeas: ${ideasCount}\nNotes/Thoughts: ${notesCount}`
        );
        return Response.json({ ok: true });
      }

      await sendTelegramMessage(
        chatId,
        `<b>Available Commands:</b>\n\n/projects — Show project phases\n/indevelopment — Projects in development\n/launched — Launched projects\n/sketching — Projects in sketching/prototyping\n/inplanning — Projects in planning/ideas\n/today — List tasks due today\n/ideas — List recent ideas\n/notes — List recent notes/thoughts\n/status — DevOS workspace status\n/clearideas — Delete all ideas\n/done — Unlock active project`
      );
      return Response.json({ ok: true });
    }

    if (/^\d+$/.test(text)) {
      const index = parseInt(text, 10);
      if (isSessionActive && session?.activeProjectId?.startsWith("phase:")) {
        const phaseDbValue = session.activeProjectId.replace("phase:", "");
        const projects = await prisma.project.findMany({
          where: {
            userId,
            phase: phaseDbValue,
            ...(phaseDbValue === "idea" ? { status: "planning" } : {})
          },
          orderBy: { name: "asc" },
        });
        if (index >= 1 && index <= projects.length) {
          const selected = projects[index - 1];
          await prisma.telegramSession.upsert({
            where: { chatId: chatId.toString() },
            update: {
              activeProjectId: selected.id,
              activeProjectName: selected.name,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
            create: {
              chatId: chatId.toString(),
              activeProjectId: selected.id,
              activeProjectName: selected.name,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
          });
          await sendTelegramMessage(
            chatId,
            `🔒 Session locked to project <b>${selected.name}</b>.\n\nAll messages will be auto-tagged to this project. Send /done to clear.`
          );
          return Response.json({ ok: true });
        }
      }
    }

    const mentionMatch = text.match(/@([\w-]+)/i);
    let projectId: string | null = null;
    let projectName: string | null = null;

    if (mentionMatch) {
      const projects = await prisma.project.findMany({ where: { userId } });
      const matched = projects.find((p) =>
        p.name.toLowerCase().includes(mentionMatch[1].toLowerCase())
      );
      if (matched) {
        projectId = matched.id;
        projectName = matched.name;
      }
    }

    if (!projectId && isSessionActive && session?.activeProjectId && !session.activeProjectId.startsWith("phase:")) {
      projectId = session.activeProjectId;
      projectName = session.activeProjectName;
    }

    const classification = await classifyCapture(text, userId);

    let savedAs = "";
    if (classification.type === "task") {
      await prisma.task.create({
        data: {
          title: classification.cleanContent || text,
          priority: classification.priority || "medium",
          dueDate: classification.dueDate || null,
          projectId,
          userId,
          source: "telegram",
        },
      });
      savedAs = `task${projectName ? ` in ${projectName}` : ""}`;
    } else if (classification.type === "idea") {
      await prisma.idea.create({
        data: {
          content: classification.cleanContent || text,
          projectId,
          source: "telegram",
          status: "raw",
          userId,
        },
      });
      savedAs = `idea${projectName ? ` for ${projectName}` : " (global)"}`;
    } else {
      await prisma.note.create({
        data: {
          content: classification.cleanContent || text,
          projectId,
          category: "note",
          source: "telegram",
          userId,
        },
      });
      savedAs = `note${projectName ? ` for ${projectName}` : ""}`;
    }

    if (isSessionActive && !session.activeProjectId?.startsWith("phase:")) {
      await prisma.telegramSession.update({
        where: { chatId: chatId.toString() },
        data: { expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });
    }

    const emoji =
      classification.type === "task"
        ? "✅"
        : classification.type === "idea"
        ? "💡"
        : "📝";
    await sendTelegramMessage(
      chatId,
      `${emoji} Saved as ${savedAs}\n\n"${classification.cleanContent || text}"`
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error in telegram webhook:", err);
    return Response.json({ ok: true });
  }
}

async function classifyCapture(text: string, userId?: string) {
  try {
    let groqKey = process.env.GROQ_API_KEY || "";
    if (userId) {
      try {
        const { decrypt } = await import("@/lib/encryption");
        const { prisma } = await import("@/lib/prisma");
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { groqApiKey: true }
        });
        if (user?.groqApiKey) {
          groqKey = decrypt(user.groqApiKey);
        }
      } catch (e) {}
    }

    if (!groqKey) {
      const lower = text.toLowerCase();
      const isTask = /^(fix|build|add|create|update|refactor|deploy|write|check|review|test|push|send|call|email|make|finish|complete)\b/.test(lower);
      const isIdea = /\b(idea|concept|what if|could we|should we|maybe|consider)\b/.test(lower);
      return {
        type: isTask ? "task" : isIdea ? "idea" : "note",
        cleanContent: text
      };
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Classify this developer's message into task, idea, or note.
Return ONLY valid JSON: { "type": "task"|"idea"|"note", "cleanContent": "cleaned text without @mentions or date words", "priority": "urgent"|"high"|"medium"|"low" (only if task), "dueDate": "YYYY-MM-DD" (only if date mentioned) }
Rules: task = actionable ("fix X", "build Y", "add Z"), idea = new feature/concept to consider, note = everything else`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq status code: ${res.status}`);
    }

    const data = await res.json();
    const rawContent = data.choices[0].message.content;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
  } catch (error) {
    console.error("Failed to classify capture:", error);
    return { type: "note", cleanContent: text };
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Error sending Telegram message:", e);
  }
}

async function getUserIdFromChatId(chatId: number): Promise<string | null> {
  const link = await prisma.telegramLink.findUnique({
    where: { chatId: chatId.toString() },
  });
  return link?.userId || null;
}
