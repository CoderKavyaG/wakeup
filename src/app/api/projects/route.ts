import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
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
    const body = await request.json();
    const { name, description, status, tags, githubUrl, liveUrl, folderPath } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // Check if project already exists to prevent duplication
    let existingProject = null;
    if (githubUrl) {
      existingProject = await prisma.project.findFirst({
        where: {
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
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
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
