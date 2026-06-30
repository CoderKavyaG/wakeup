import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.warn("[API Machine GET] Unauthorized request to", request.url);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { pathname, searchParams } = new URL(request.url);
    const action = pathname.split('/').pop();
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    console.log("[API Machine GET] Action:", action, "Query:", query);
    
    const res = await agentFetch(`/${action}${query}`, {
      method: 'GET',
    });

    console.log("[API Machine GET] agentFetch status:", res.status);

    if (!res.ok) {
      return NextResponse.json({ error: "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API Machine GET] Error:", error);
    return NextResponse.json({ error: "DevOS Agent is offline." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.warn("[API Machine POST] Unauthorized request to", request.url);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const action = pathname.split('/').pop();
    const body = await request.json();

    console.log("[API Machine POST] Action:", action, "Body:", body);

    const res = await agentFetch(`/${action}`, {
      method: 'POST',
      body,
    });

    console.log("[API Machine POST] agentFetch status:", res.status);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API Machine POST] Error:", error);
    return NextResponse.json({ error: "DevOS Agent is offline." }, { status: 503 });
  }
}

