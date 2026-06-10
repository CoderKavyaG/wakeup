import { streamText, createTextStreamResponse } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@/auth";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const { platform, commitSummary } = await req.json();
    if (!platform || !commitSummary) {
      return Response.json({ error: "platform and commitSummary are required" }, { status: 400 });
    }

    let modelInstance = null;
    if (process.env.GROQ_API_KEY) {
      modelInstance = groq("llama-3.3-70b-versatile");
    } else if (process.env.OPENROUTER_API_KEY) {
      modelInstance = openrouter("google/gemma-4-26b-a4b-it:free");
    }

    if (!modelInstance) {
      return Response.json(
        { error: "Please configure your GROQ_API_KEY or OPENROUTER_API_KEY." },
        { status: 500 }
      );
    }

    const voicePrompt = `You are generating a post for Kavya's developer profile.
Kavya is a student developer from India building "DevOS" (a personal developer OS / cockpit).
Kavya's voice guidelines:
- Technical, authentic, and direct.
- Avoid marketing buzzwords, emojis (max 1 subtle emoji if appropriate, but generally none), and corporate speak.
- Sound like a student developer building in public: sharing progress, debugging late at night, adding real utility.
- Highlight specific features or files shipped rather than generic high-level concepts.
- For X (Twitter): Keep it strictly under 240 characters. One concise statement of what was shipped.
- For LinkedIn: Keep it under 150 words. Write a clean, structured build-in-public update.

Here is the commit summary for the week:
${commitSummary}

Generate a post for ${platform === "twitter" ? "X / Twitter (under 240 characters)" : "LinkedIn (short build-in-public post)"}. Do not wrap the response in quotes, just return the raw text of the post.`;

    const result = streamText({
      model: modelInstance,
      system: "You are a specialized AI assistant that helps developer Kavya draft social updates in her authentic voice.",
      prompt: voicePrompt,
      maxOutputTokens: platform === "twitter" ? 100 : 400,
    });

    return createTextStreamResponse({ textStream: result.textStream });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
