import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

const model = openai.embedding("text-embedding-3-small");

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embeddings } = await embedMany({
      model,
      values: [text],
    });
    return embeddings[0];
  } catch (err) {
    console.error("Embedding error:", err);
    throw err;
  }
}

// Cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return normA && normB ? dotProduct / (normA * normB) : 0;
}

// Chunk text by sentences (minimal approach)
export function chunkText(text: string, maxSize: number = 500): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  sentences.forEach((sentence) => {
    if ((current + sentence).length > maxSize) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  });

  if (current) chunks.push(current.trim());
  return chunks;
}
