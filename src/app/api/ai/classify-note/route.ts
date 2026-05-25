import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      system: "You are a specialized parsing assistant. The user will provide a block of text containing feedback, bugs, or ideas. Your primary job is to aggressively split this text into distinct, separate points. If the user provides a list (e.g., 'CHANGE 1', 'CHANGE 2', or bullet points), you MUST break each item into its own separate feedback object in the array. Do not group multiple distinct changes or ideas into a single item. For each point, provide the 'content' (the exact text for that specific point) and the 'category' strictly chosen from: 'general feedback', 'bug report', 'feature idea', or 'general note'.",
      prompt: `Parse this text:\n\n${text}`,
      schema: z.object({
        items: z.array(z.object({
          content: z.string(),
          category: z.enum(["general feedback", "bug report", "feature idea", "general note"])
        }))
      })
    });

    return NextResponse.json({ items: result.object.items });
  } catch (error) {
    console.error("Classification error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
