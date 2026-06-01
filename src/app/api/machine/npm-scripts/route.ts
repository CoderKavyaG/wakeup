import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    const res = await fetch(`http://127.0.0.1:3131/npm-scripts?path=${encodeURIComponent(path)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch npm scripts" }, { status: 500 });
  }
}
