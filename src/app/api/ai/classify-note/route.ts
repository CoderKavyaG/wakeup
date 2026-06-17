import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { noteId, content, projectName } = await request.json();

    if (noteId) {
      const note = await prisma.note.findUnique({
        where: { id: noteId }
      });
      if (!note || note.userId !== userId) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { groqApiKey: true, openrouterApiKey: true }
    });

    const decryptedGroq = user?.groqApiKey ? decrypt(user.groqApiKey) : "";
    const decryptedOpenrouter = user?.openrouterApiKey ? decrypt(user.openrouterApiKey) : "";

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
      modelInstance = openrouterClient("openai/gpt-4o-mini");
    }

    if (!modelInstance) {
      return NextResponse.json({ error: "Please configure your Groq or OpenRouter API keys in Settings." }, { status: 500 });
    }

    const { text: result } = await generateText({
      model: modelInstance,
      prompt: `Classify this developer note for the project '${projectName || 'General'}': '${content}'. Reply with ONLY one word: feedback, bug, idea, or note`,
    });

    const category = result.trim().toLowerCase();

    if (noteId) {
      await prisma.note.update({
        where: { id: noteId },
        data: { category }
      });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Classification error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
