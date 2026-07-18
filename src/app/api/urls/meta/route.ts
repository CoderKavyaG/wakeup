import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Abort fetch after 5 seconds to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(targetUrl.href, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Wakeup/1.0 (Meta Fetcher)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ title: targetUrl.hostname }); // Fallback to hostname
    }

    const html = await response.text();
    
    // Simple regex to grab the title tag content
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : targetUrl.hostname;

    // Decode some basic HTML entities
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return NextResponse.json({ title });
  } catch (error) {
    // If anything fails (like a timeout or CORS issue), just gracefully fallback to returning nothing or an error
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
