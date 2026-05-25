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
      system: "You are a specialized parsing assistant. The user will provide a block of text containing feedback, bugs, or ideas. Your job is to split this text into distinct, separate points. For each point, provide the 'content' (the exact or slightly cleaned up text) and the 'category' strictly chosen from: 'general feedback', 'bug report', 'feature idea', or 'general note'.",
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
