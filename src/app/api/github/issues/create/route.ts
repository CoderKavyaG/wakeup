import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { repo, title, body } = await request.json();

    if (!repo || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let token: string | null | undefined = process.env.GITHUB_TOKEN;

    const authHeader = request.headers.get("Authorization");
    const headerToken = authHeader ? authHeader.replace("Bearer ", "").replace("token ", "") : null;
    if (headerToken) {
      token = headerToken;
    } else {
      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: userId },
          select: { githubToken: true }
        });
        if (userRecord?.githubToken) {
          token = decrypt(userRecord.githubToken);
        }
      } catch (e) {
        console.error("Failed to read github token from db:", e);
      }
    }

    if (!token) {
      return NextResponse.json({ error: "No GITHUB_TOKEN configured in environment or passed in request" }, { status: 500 });
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GitHub API returned ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
