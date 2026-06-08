import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

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

    const { text: result } = await generateText({
      model: openrouter("openai/gpt-4o-mini"),
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
