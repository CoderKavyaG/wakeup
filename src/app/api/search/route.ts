import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

interface SearchRequest {
  query: string;
  filters?: {
    types?: string[];
    status?: string[];
    priority?: string[];
    dateRange?: { from?: string; to?: string };
    tags?: string[];
  };
}

// Simple relevance scoring (no ML required)
function calculateRelevance(query: string, text: string, isTitle: boolean = false): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  let score = 0;

  // Exact match gets highest score
  if (textLower === queryLower) score = 100;
  // Title match gets high score
  else if (isTitle && textLower.includes(queryLower)) score = 85;
  // Substring match
  else if (textLower.includes(queryLower)) score = 60;
  // Word boundary match (token-based)
  else {
    const tokens = queryLower.split(/\s+/);
    const matchedTokens = tokens.filter((token) => textLower.includes(token));
    score = (matchedTokens.length / tokens.length) * 50;
  }

  // Boost recency
  return Math.min(100, score);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body: SearchRequest = await request.json();
    const { query, filters } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];

    // 1. Search Projects
    if (!filters?.types || filters.types.includes("project")) {
      const projects = await prisma.project.findMany({
        where: { userId },
      });

      projects.forEach((project) => {
        const titleScore = calculateRelevance(query, project.name, true);
        const descScore = project.description
          ? calculateRelevance(query, project.description, false)
          : 0;
        const urlScore = project.githubUrl
          ? calculateRelevance(query, project.githubUrl, false)
          : 0;

        const relevance = Math.max(titleScore, descScore, urlScore);

        if (relevance > 20) {
          // Apply status filter
          if (filters?.status && !filters.status.includes(project.status)) {
            return;
          }

          results.push({
            id: project.id,
            type: "project",
            title: project.name,
            description: project.description,
            metadata: {
              status: project.status,
              url: project.liveUrl,
              updatedAt: project.updatedAt.toISOString(),
              tags: [project.status, project.githubUrl ? "github" : null].filter(Boolean),
            },
            relevanceScore: relevance,
            matchedFields: [
              titleScore > descScore ? "name" : "description",
              project.githubUrl ? "github_url" : null,
            ].filter(Boolean),
          });
        }
      });
    }

    // 2. Search Tasks
    if (!filters?.types || filters.types.includes("task")) {
      const tasks = await prisma.task.findMany({
        where: { userId },
      });

      tasks.forEach((task) => {
        const titleScore = calculateRelevance(query, task.title, true);
        const relevance = titleScore;

        if (relevance > 20) {
          // Apply priority filter
          if (filters?.priority && !filters.priority.includes(task.priority)) {
            return;
          }

          // Apply status filter
          const taskStatus = task.completed ? "completed" : "pending";
          if (filters?.status && !filters.status.includes(taskStatus)) {
            return;
          }

          results.push({
            id: task.id,
            type: "task",
            title: task.title,
            description: undefined,
            metadata: {
              priority: task.priority,
              status: taskStatus,
              dueDate: task.dueDate || undefined,
              updatedAt: task.updatedAt.toISOString(),
              tags: [task.priority, taskStatus].filter(Boolean),
            },
            relevanceScore: relevance,
            matchedFields: ["title"].filter(Boolean),
          });
        }
      });
    }

    // 3. Search Notes
    if (!filters?.types || filters.types.includes("note")) {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          NOT: {
            source: {
              in: ["cockpit_helpful", "cockpit_unhelpful"]
            }
          }
        },
      });

      notes.forEach((note) => {
        const contentScore = calculateRelevance(query, note.content, false);
        const relevance = contentScore;

        if (relevance > 20) {
          results.push({
            id: note.id,
            type: "note",
            title: note.content.substring(0, 50) + (note.content.length > 50 ? "..." : ""),
            description: note.content,
            metadata: {
              updatedAt: note.createdAt.toISOString(),
              tags: ["note"],
            },
            relevanceScore: relevance,
            matchedFields: ["content"],
          });
        }
      });
    }

    // 4. Search Ideas
    if (!filters?.types || filters.types.includes("idea")) {
      const ideas = await prisma.idea.findMany({
        where: { userId },
        include: { project: { select: { id: true, name: true } } },
      });

      ideas.forEach((idea) => {
        const score = calculateRelevance(query, idea.content, false);
        if (score > 20) {
          results.push({
            id: idea.id,
            type: "idea",
            title: idea.content.substring(0, 60) + (idea.content.length > 60 ? "..." : ""),
            description: idea.project ? `Project: ${idea.project.name}` : "Global idea",
            metadata: {
              status: idea.status,
              source: idea.source,
              starred: idea.starred,
              updatedAt: idea.updatedAt.toISOString(),
              tags: ["idea", idea.status, idea.source].filter(Boolean),
            },
            relevanceScore: score,
            matchedFields: ["content"],
          });
        }
      });
    }

    // 5. Search URLs
    if (!filters?.types || filters.types.includes("url")) {
      const urls = await prisma.url.findMany({
        where: { userId },
      });

      urls.forEach((url) => {
        const labelScore = calculateRelevance(query, url.label, true);
        const urlScore = calculateRelevance(query, url.url, false);

        const relevance = Math.max(labelScore, urlScore);

        if (relevance > 20) {
          // Apply tags/category filter
          if (filters?.tags && !filters.tags.includes(url.category)) {
            return;
          }

          results.push({
            id: url.id,
            type: "url",
            title: url.label || url.url,
            description: url.url,
            metadata: {
              url: url.url,
              tags: [url.category].filter(Boolean),
              updatedAt: url.createdAt.toISOString(),
            },
            relevanceScore: relevance,
            matchedFields: [
              labelScore > urlScore ? "label" : "url",
            ].filter(Boolean),
          });
        }
      });
    }

    // 5. Search GitHub data (recent commits/PRs from notes/projects)
    if (!filters?.types || filters.types.includes("github")) {
      const projects = await prisma.project.findMany({
        where: { userId, githubUrl: { not: null } },
      });

      projects.forEach((project) => {
        if (project.githubUrl) {
          const repoScore = calculateRelevance(query, project.githubUrl, true);
          if (repoScore > 20) {
            results.push({
              id: `github-${project.id}`,
              type: "github",
              title: `GitHub: ${project.name}`,
              description: project.githubUrl,
              metadata: {
                url: project.githubUrl,
                status: project.status,
                updatedAt: project.updatedAt.toISOString(),
                tags: ["github", project.status],
              },
              relevanceScore: repoScore,
              matchedFields: ["github_url"],
            });
          }
        }
      });
    }

    // Sort by relevance score (descending)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return NextResponse.json({
      results: results.slice(0, 20), // Top 20 results
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Search error occurred";
    return NextResponse.json(
      { error: errorMessage, results: [] },
      { status: 500 }
    );
  }
}
