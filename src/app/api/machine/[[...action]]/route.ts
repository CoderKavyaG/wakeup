import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { pathname, searchParams } = new URL(request.url);
    const action = pathname.split('/').pop();
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    const res = await agentFetch(`/${action}${query}`, {
      method: 'GET',
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "DevOS Agent is offline." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const action = pathname.split('/').pop();
    const body = await request.json();

    const res = await agentFetch(`/${action}`, {
      method: 'POST',
      body,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "DevOS Agent is offline." }, { status: 503 });
  }
}

