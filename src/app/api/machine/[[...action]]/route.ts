import { NextResponse } from "next/server";

const AGENT_URL = "http://localhost:3131";

export async function GET(request: Request) {
  try {
    const { pathname, searchParams } = new URL(request.url);
    const action = pathname.split('/').pop();
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    const res = await fetch(`${AGENT_URL}/${action}${query}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Agent returned error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    // If agent is not running, return empty array for ports/files so widget doesn't crash
    const { pathname } = new URL(request.url);
    if (pathname.includes('/ports') || pathname.includes('/files')) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: "DevOS Agent is offline." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const { pathname } = new URL(request.url);
    const action = pathname.split('/').pop();
    const body = await request.json();

    const res = await fetch(`${AGENT_URL}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
