import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.warn("[API Machine Open] Unauthorized request to", request.url);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("[API Machine Open] Request body:", body);

    const res = await agentFetch("/open", {
      method: "POST",
      body,
    });

    console.log("[API Machine Open] agentFetch response status:", res.status);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Machine Open] Error:", error);
    return NextResponse.json({ error: error.message || "Wakeup Agent is offline." }, { status: 503 });
  }
}
