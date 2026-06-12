import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get("workspace");

    const projects = await prisma.project.findMany({
      where: { 
        userId,
        ...(workspace ? { workspace } : {})
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { 
      name, 
      description, 
      status, 
      tags, 
      githubUrl, 
      liveUrl, 
      folderPath,
      workspace,
      type,
      priority,
      pinned,
      confidenceLevel,
      effortEstimate,
      potentialImpact,
      stage
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // Check if project already exists to prevent duplication for this user
    let existingProject = null;
    if (githubUrl) {
      existingProject = await prisma.project.findFirst({
        where: {
          userId,
          githubUrl: {
            equals: githubUrl,
            mode: "insensitive"
          }
        }
      });
    }
    if (!existingProject && folderPath) {
      existingProject = await prisma.project.findFirst({
        where: {
          userId,
          folderPath: {
            equals: folderPath,
            mode: "insensitive"
          }
        }
      });
    }

    if (existingProject) {
      return NextResponse.json(existingProject);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        status: status || "active",
        tags: tags || [],
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        folderPath: folderPath || null,
        projectHealth: 100.0,
        momentumScore: 0.0,
        completionPercentage: 0.0,
        userId,
        workspace: workspace || "main",
        type: type || "code",
        priority: priority || "medium",
        pinned: pinned !== undefined ? pinned : false,
        confidenceLevel: confidenceLevel !== undefined ? confidenceLevel : null,
        effortEstimate: effortEstimate || null,
        potentialImpact: potentialImpact || null,
        stage: stage || null,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
