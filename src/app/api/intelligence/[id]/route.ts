import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = await params;

    // Verify ownership
    const insight = await prisma.aIInsight.findUnique({
      where: { id },
    });
    if (!insight || insight.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const updated = await prisma.aIInsight.update({
      where: { id },
      data: { read: true }
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark insight as read";
    console.error(`[/api/intelligence/[id]] PATCH Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
