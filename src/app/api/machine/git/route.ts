import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const res = await fetch(`http://127.0.0.1:3131/git?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error("Agent error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ branch: "", commit: "" }, { status: 503 });
  }
}
