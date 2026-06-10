import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
    const commits = await prisma.commit.findMany({
      where: {
        date: { gte: oneWeekAgo },
        project: {
          userId: session.user.id
        }
      },
      orderBy: { date: "desc" },
    });

    if (commits.length === 0) {
      return NextResponse.json({ summary: "No commits found in the last 7 days." });
    }

    // Group commits by repoName
    const grouped: Record<string, string[]> = {};
    commits.forEach((c) => {
      const key = c.repoName || "unknown-repo";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c.message);
    });

    const summaryLines = Object.entries(grouped).map(([repo, msgs]) => {
      const uniqueMsgs = Array.from(new Set(msgs)).slice(0, 5); // top 5 unique commits
      return `${repo}:\n${uniqueMsgs.map((m) => `  - ${m}`).join("\n")}`;
    });

    const summary = summaryLines.join("\n\n");
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
