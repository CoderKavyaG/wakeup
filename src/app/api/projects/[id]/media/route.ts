import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/media - list media items
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const media = await prisma.mediaItem.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

// POST /api/projects/[id]/media - add media item
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, url, thumbnailUrl, title, description, mimeType, sizeBytes } = body;

    if (!type || !url) {
      return NextResponse.json({ error: "Type and URL are required" }, { status: 400 });
    }

    const media = await prisma.mediaItem.create({
      data: {
        type,
        url,
        thumbnailUrl,
        title,
        description,
        mimeType,
        sizeBytes: sizeBytes ? parseInt(sizeBytes) : null,
        projectId: id,
        userId,
      }
    });

    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create media item" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/media?mediaId=X - delete media item
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.mediaItem.delete({
      where: { id: mediaId, projectId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
  }
}
