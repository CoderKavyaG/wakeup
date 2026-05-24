import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { repo, title, body } = await request.json();

    if (!repo || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "No GITHUB_TOKEN configured in environment" }, { status: 500 });
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
