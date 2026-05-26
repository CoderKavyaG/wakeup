import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = await fetch("http://127.0.0.1:3131/restart", {
      method: "POST"
    });
    if (!res.ok) throw new Error("Agent error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to restart agent" }, { status: 503 });
  }
}
