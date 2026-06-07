import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
