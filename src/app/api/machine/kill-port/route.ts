import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { port } = await request.json();
    if (!port) return NextResponse.json({ error: "Missing port" }, { status: 400 });

    const res = await agentFetch("/kill-port", {
      method: "POST",
      body: { port }
    });

    if (!res.ok) throw new Error("Failed to kill port");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

