import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface IDECommand {
  command: string;
  context?: {
    fileName?: string;
    filePath?: string;
    selectedText?: string;
    cursor?: { line: number; column: number };
  };
}

interface IDEResponse {
  success: boolean;
  data?: any;
  message?: string;
}

// IDE Bridge - Enables VS Code and other IDEs to communicate with DevOS
export async function POST(request: Request) {
  try {
    const body: IDECommand = await request.json();
    const { command, context } = body;

    // Verify IDE bridge is enabled (optional: API key validation)
    const ideToken = request.headers.get("x-ide-token");
    if (ideToken !== process.env.IDE_BRIDGE_TOKEN && process.env.IDE_BRIDGE_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Retrieve owner user dynamically
    const owner = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" }
    });
    if (!owner) {
      return NextResponse.json(
        { success: false, message: "No registered user found in the system." },
        { status: 500 }
      );
    }
    const userId = owner.id;

    let response: IDEResponse = { success: false };

    switch (command) {
      case "get-current-project":
        response = await handleGetCurrentProject(userId, context);
        break;

      case "create-task-from-selection":
        response = await handleCreateTaskFromSelection(userId, context);
        break;

      case "create-note-from-file":
        response = await handleCreateNoteFromFile(userId, context);
        break;

      case "get-active-tasks":
        response = await handleGetActiveTasks(userId);
        break;

      case "get-project-context":
        response = await handleGetProjectContext(userId, context);
        break;

      case "quick-capture":
        response = await handleQuickCapture(userId, context);
        break;

      case "open-in-ide":
        response = await handleOpenInIDE(context);
        break;

      case "get-ai-suggestions":
        response = await handleGetAISuggestions(context);
        break;

      default:
        response = { success: false, message: `Unknown command: ${command}` };
    }

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "IDE bridge error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

async function handleGetCurrentProject(userId: string, context?: IDECommand["context"]): Promise<IDEResponse> {
  // Infer project from file path
  if (!context?.filePath) {
    return { success: false, message: "No file path provided" };
  }

  const projects = await prisma.project.findMany({ where: { userId } });
  // Simple heuristic: match repo name from file path
  const matchedProject = projects.find((p) =>
    context.filePath?.toLowerCase().includes(p.name.toLowerCase())
  );

  if (!matchedProject) {
    return { success: false, message: "No matching project found" };
  }

  return {
    success: true,
    data: {
      id: matchedProject.id,
      name: matchedProject.name,
      status: matchedProject.status,
      description: matchedProject.description,
      githubUrl: matchedProject.githubUrl,
      liveUrl: matchedProject.liveUrl,
    },
  };
}

async function handleCreateTaskFromSelection(userId: string, context?: IDECommand["context"]): Promise<IDEResponse> {
  if (!context?.selectedText) {
    return { success: false, message: "No selected text provided" };
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: context.selectedText.substring(0, 100),
        priority: "medium",
        completed: false,
        dueDate: null,
        userId,
      },
    });

    return {
      success: true,
      data: task,
      message: "Task created from selection",
    };
  } catch (err) {
    return { success: false, message: `Failed to create task: ${err}` };
  }
}

async function handleCreateNoteFromFile(userId: string, context?: IDECommand["context"]): Promise<IDEResponse> {
  if (!context?.selectedText && !context?.fileName) {
    return { success: false, message: "No content provided" };
  }

  try {
    const note = await prisma.note.create({
      data: {
        content: `[${context.fileName || "IDE"}] ${context.selectedText || ""}`,
        userId,
      },
    });

    return {
      success: true,
      data: note,
      message: "Note created from file",
    };
  } catch (err) {
    return { success: false, message: `Failed to create note: ${err}` };
  }
}

async function handleGetActiveTasks(userId: string): Promise<IDEResponse> {
  try {
    const tasks = await prisma.task.findMany({
      where: { completed: false, userId },
      orderBy: { priority: "desc" },
      take: 10,
    });

    return {
      success: true,
      data: tasks,
    };
  } catch (err) {
    return { success: false, message: `Failed to fetch tasks: ${err}` };
  }
}

async function handleGetProjectContext(userId: string, context?: IDECommand["context"]): Promise<IDEResponse> {
  try {
    if (!context?.filePath) {
      return { success: false, message: "No file path provided" };
    }

    // Get project info
    const projectRes = await handleGetCurrentProject(userId, context);
    if (!projectRes.success || !projectRes.data) {
      return projectRes;
    }

    const projectId = projectRes.data.id;

    // Get related tasks and notes
    const tasks = await prisma.task.findMany({
      where: { completed: false, userId, projectId },
      take: 5,
    });

    const notes = await prisma.note.findMany({
      where: {
        userId,
        projectId,
        NOT: {
          source: {
            in: ["cockpit_helpful", "cockpit_unhelpful"]
          }
        }
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: {
        project: projectRes.data,
        recentTasks: tasks,
        recentNotes: notes,
      },
    };
  } catch (err) {
    return { success: false, message: `Failed to get project context: ${err}` };
  }
}

async function handleQuickCapture(userId: string, context?: IDECommand["context"]): Promise<IDEResponse> {
  if (!context?.selectedText) {
    return { success: false, message: "No content to capture" };
  }

  try {
    const note = await prisma.note.create({
      data: {
        content: context.selectedText,
        userId,
      },
    });

    return {
      success: true,
      data: note,
      message: "Captured to brain dump",
    };
  } catch (err) {
    return { success: false, message: `Failed to capture: ${err}` };
  }
}

async function handleOpenInIDE(context?: IDECommand["context"]): Promise<IDEResponse> {
  // This would trigger IDE-specific commands
  // For VS Code: Open file at specific line/column
  if (!context?.filePath) {
    return { success: false, message: "No file path provided" };
  }

  return {
    success: true,
    message: `Opening ${context.filePath} in IDE`,
    data: {
      command: "vscode.open",
      uri: `file://${context.filePath}`,
      range: context.cursor ? [context.cursor.line, context.cursor.column] : undefined,
    },
  };
}

async function handleGetAISuggestions(context?: IDECommand["context"]): Promise<IDEResponse> {
  if (!context?.selectedText) {
    return { success: false, message: "No code context provided" };
  }

  return {
    success: true,
    data: {
      suggestions: [
        "Consider extracting this to a helper function",
        "Related: Task #123 mentioned similar logic",
        "Check documentation on design patterns",
      ],
    },
  };
}

export async function GET(request: Request) {
  // IDE bridge health check
  return NextResponse.json({
    status: "healthy",
    version: "1.0.0",
    features: [
      "project-detection",
      "task-creation",
      "note-capture",
      "quick-access",
      "context-aware-suggestions",
    ],
    supportedIDEs: ["vscode", "cursor", "zed"],
  });
}
