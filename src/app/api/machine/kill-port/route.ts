import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { port } = await request.json();
    if (!port) return NextResponse.json({ error: "Missing port" }, { status: 400 });

    const res = await fetch("http://localhost:3131/kill-port", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ port })
    });

    if (!res.ok) throw new Error("Failed to kill port");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
