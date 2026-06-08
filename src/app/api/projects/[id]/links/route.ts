import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

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

    const links = await prisma.projectLink.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(links);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}

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

    const { url, label } = await request.json();

    if (!url || !label) {
      return NextResponse.json({ error: "URL and label are required" }, { status: 400 });
    }

    let type = "other";
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("vercel.app")) type = "frontend";
    else if (lowerUrl.includes("railway.app")) type = "backend";
    else if (lowerUrl.includes("supabase.co")) type = "database";
    else if (lowerUrl.includes("firebase")) type = "storage";
    else if (lowerUrl.includes("sentry.io")) type = "monitoring";

    const newLink = await prisma.projectLink.create({
      data: {
        projectId: id,
        label,
        url,
        type
      }
    });

    return NextResponse.json(newLink);
  } catch (error) {
    console.error("Failed to create link:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
