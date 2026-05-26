import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:3131/stats");
    if (!res.ok) throw new Error("Agent error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ cpu: 0, ram: 0 }, { status: 503 });
  }
}
