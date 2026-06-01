import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:3131/git-status-all", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch git status" }, { status: 500 });
  }
}
