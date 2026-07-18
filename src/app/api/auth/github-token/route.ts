import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

// POST /api/auth/github-token — Save and encrypt GitHub PAT
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { token, username } = body;

    if (!token || !username) {
      return NextResponse.json({ error: "Token and username are required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        githubToken: encrypt(token),
        githubUsername: username,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/auth/github-token — Remove GitHub PAT
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        githubToken: null,
        githubUsername: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
