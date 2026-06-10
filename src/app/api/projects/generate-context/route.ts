import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { scanned } = await req.json();
    if (!scanned) {
      return NextResponse.json({ error: "Missing scanned project details" }, { status: 400 });
    }

    let modelInstance = null;
    if (process.env.GROQ_API_KEY) {
      modelInstance = groq("llama-3.3-70b-versatile");
    } else if (process.env.OPENROUTER_API_KEY) {
      modelInstance = openrouter("openai/gpt-4o-mini");
    }

    if (!modelInstance) {
      return NextResponse.json({ error: "No AI provider configured" }, { status: 500 });
    }

    const { name, description, tags, githubUrl, lastCommitMessage, deployHints, folderPath, rootFiles } = scanned;

    const filesList = rootFiles?.map((f: any) => `${f.name}${f.isDirectory ? '/' : ''}`).join(', ') || 'unknown';

    const systemPrompt = `You are a Senior Developer AI assistant. Generate customized developer context files (CLAUDE.md and AGENTS.md) for a project based on its directory scan.
You MUST respond with a JSON object containing exactly two keys: "claudeMd" and "agentsMd". Do not output any markdown formatting wrapping the JSON. The JSON values must be raw string contents of the markdown files.

For CLAUDE.md:
- Include commands for: build, dev/run, test, and lint based on project tags (e.g. Next.js, React, Python, Go, Rust, etc.)
- Style guidelines: code style, typical structure, naming conventions
- Include direct references to common files detected in rootFiles

For AGENTS.md:
- Briefly describe the project name and stack quick reference
- Identify key stack pieces and list "what not to do" patterns (avoiding common frameworks antipatterns or defaults)
- Add database models, auth patterns, or color systems if applicable to the detected stack
- Keep it aligned but distinct from CLAUDE.md (focused on the AI coding assistant's behavior rules)`;

    const userPrompt = `Project Name: ${name}
Description: ${description}
Tags: ${tags?.join(', ')}
GitHub URL: ${githubUrl || 'None'}
Last Commit: ${lastCommitMessage || 'None'}
Deploy Hints: ${deployHints?.join(', ') || 'None'}
Root Files/Folders: ${filesList}
Folder Path: ${folderPath}

Please generate the JSON response.`;

    const { text } = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Parse output
    let parsed;
    try {
      // Clean up text if LLM wrapped it in markdown code blocks
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      parsed = JSON.parse(cleanText.trim());
    } catch (err) {
      console.error("Failed to parse JSON response from LLM:", text);
      return NextResponse.json({ error: "AI failed to return valid JSON context", raw: text }, { status: 500 });
    }

    return NextResponse.json({
      claudeMd: parsed.claudeMd,
      agentsMd: parsed.agentsMd
    });
  } catch (error: any) {
    console.error("Context generation route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
