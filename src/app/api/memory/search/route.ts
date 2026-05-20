import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateEmbedding, cosineSimilarity } from "@/lib/embeddings";

interface SearchRequest {
  query: string;
  projectId?: string;
  limit?: number;
}

export async function POST(request: Request) {
  try {
    const { query, projectId, limit = 5 }: SearchRequest = await request.json();

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Fetch all memories (limited scope for cost)
    let memories = await prisma.memory.findMany({
      where: projectId ? { projectId } : {},
      take: 100, // Search within recent 100 memories
      orderBy: { createdAt: "desc" },
    });

    // Score memories by embedding similarity
    const scored = memories
      .map((mem) => {
        const score = mem.embedding && mem.embedding.length > 0
          ? cosineSimilarity(queryEmbedding, mem.embedding)
          : 0;
        return { memory: mem, score };
      })
      .filter((s) => s.score > 0.5) // Threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({
      results: scored.map((s) => ({
        id: s.memory.id,
        content: s.memory.content,
        score: Math.round(s.score * 100),
        sourceType: s.memory.sourceType,
        projectId: s.memory.projectId,
        metadata: s.memory.metadata,
      })),
      query,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Search error";
    console.error("Vector search error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage, results: [] },
      { status: 500 }
    );
  }
}
