import { NextResponse } from "next/server";
import fs from "fs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Verify folder exists
    if (!fs.existsSync(path)) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const stat = fs.statSync(path);
    const lastModified = stat.mtime;

    return NextResponse.json({
      lastModified: lastModified.toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
