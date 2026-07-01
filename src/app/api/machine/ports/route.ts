import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.warn("[API Machine Ports] Unauthorized request to", request.url);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    console.log("[API Machine Ports] Fetching active ports from agent...");
    const res = await agentFetch("/ports", {
      method: "GET",
    });

    console.log("[API Machine Ports] agentFetch response status:", res.status);

    if (!res.ok) {
      return NextResponse.json({ error: "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Machine Ports] Error:", error);
    return NextResponse.json({ error: error.message || "DevOS Agent is offline." }, { status: 503 });
  }
}
