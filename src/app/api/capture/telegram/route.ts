import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify the request is from Telegram
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

    // STEP 1: Detect @project mention
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

    // STEP 2: AI classification
    const classification = await classifyCapture(text, userId);


    // STEP 3: Save based on type
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

    // STEP 4: Reply with confirmation
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
    // Try user's own encrypted Groq key first, then fall back to server-side key
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
      // No key at all — fall back to simple keyword classification
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
