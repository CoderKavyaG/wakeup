import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

export async function POST(request: Request) {
  try {
    const { text, noteId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const result = await generateObject({
      model: openrouter("openai/gpt-4o-mini"),
      system: "You are a specialized parsing assistant. The user will provide a block of text containing tasks, feedback, bugs, or ideas. Your primary job is to aggressively split this text into distinct, separate points, UP TO A MAXIMUM OF 3 POINTS. Do not exceed 3 distinct items. If the text only contains 1 or 2 distinct core ideas, only return 1 or 2 items. If the user provides a list, you MUST break each item into its own separate feedback object in the array, but never exceed 3 total items. For each point, provide the 'content' (the exact text for that specific point) and the 'category' strictly chosen from: 'task', 'general feedback', 'bug report', 'feature idea', or 'general note'.",
      prompt: `Parse this text:\n\n${text}`,
      schema: z.object({
        items: z.array(z.object({
          content: z.string(),
          category: z.enum(["task", "general feedback", "bug report", "feature idea", "general note"])
        }))
      })
    });

    const items = result.object.items;

    if (noteId && items && items.length > 0) {
      const mainItem = items.find(item => item.category !== "task") || items[0];
      await prisma.note.update({
        where: { id: noteId },
        data: { category: mainItem.category }
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Classification error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
