import prisma from "@/lib/prisma";
import { generateEmbedding, chunkText } from "@/lib/embeddings";

export async function indexNotes() {
  const notes = await prisma.note.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const note of notes) {
    // Skip if already indexed
    const exists = await prisma.memory.findFirst({
      where: { sourceId: note.id, sourceType: "note" },
    });
    if (exists) continue;

    const chunks = chunkText(note.content, 400);
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      await prisma.memory.create({
        data: {
          content: chunk,
          sourceType: "note",
          sourceId: note.id,
          embedding,
          metadata: { sourceId: note.id },
        },
      });
    }
  }
}

export async function indexProjectREADME(projectName: string) {
  // Placeholder: would fetch README from GitHub
  const readme = `# ${projectName}\n\nProject documentation here.`;
  const chunks = chunkText(readme, 500);

  const project = await prisma.project.findFirst({
    where: { name: projectName },
  });
  if (!project) return;

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    await prisma.memory.create({
      data: {
        content: chunk,
        sourceType: "readme",
        projectId: project.id,
        embedding,
        metadata: { projectName },
      },
    });
  }
}

export async function indexTasks() {
  const tasks = await prisma.task.findMany({
    where: { completed: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  for (const task of tasks) {
    const exists = await prisma.memory.findFirst({
      where: { sourceId: task.id, sourceType: "task" },
    });
    if (exists) continue;

    const embedding = await generateEmbedding(task.title);
    await prisma.memory.create({
      data: {
        content: task.title,
        sourceType: "task",
        sourceId: task.id,
        embedding,
        metadata: { priority: task.priority, dueDate: task.dueDate },
      },
    });
  }
}

export async function indexProjectMemories(projectId: string) {
  // Aggregate all memories for a project
  const memories = await prisma.memory.findMany({
    where: { projectId },
  });

  const summary = memories.slice(0, 10).map((m) => m.content).join("\n");
  const recentEvents = memories
    .slice(0, 5)
    .map((m) => ((m.metadata as any)?.sourceId) || m.content);

  await prisma.projectMemory.upsert({
    where: { projectId },
    create: {
      projectId,
      summary,
      recentEvents,
      totalMemories: memories.length,
      lastIndexed: new Date(),
    },
    update: {
      summary,
      recentEvents,
      totalMemories: memories.length,
      lastIndexed: new Date(),
    },
  });
}
