import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentFetch } from "@/lib/agentFetch";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    const res = await agentFetch(`/npm-scripts?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch npm scripts" }, { status: 500 });
  }
}

