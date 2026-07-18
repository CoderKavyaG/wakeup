import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { text, content } = body;
    const input = (text || content || "").trim();

    if (!input) {
      return NextResponse.json({ error: "Empty input" }, { status: 400 });
    }
    if (input.length > 2000) {
      return NextResponse.json({ error: "Input too long (max 2000 chars)" }, { status: 400 });
    }

    // Default to saving note
    const note = await prisma.note.create({
      data: {
        content: input,
        category: "note",
        source: "api_capture",
        userId,
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
