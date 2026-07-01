import { NextResponse } from "next/server";
import { agentFetch } from "@/lib/agentFetch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await agentFetch("/stats");
    return NextResponse.json({ online: res.ok });
  } catch (e) {
    return NextResponse.json({ online: false }, { status: 503 });
  }
}
