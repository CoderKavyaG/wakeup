import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// ── OG metadata fetcher (lightweight) ──
async function fetchOGImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Wakeup/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1]
                 || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)?.[1];
    return ogImage || null;
  } catch {
    return null;
  }
}

function getFaviconUrl(urlString: string): string | null {
  try {
    let cleanUrl = urlString.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const url = new URL(cleanUrl);
    return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
  } catch {
    return null;
  }
}


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const body = await request.json();
    const { 
      phase, 
      name, 
      description, 
      status, 
      coverImageUrl, 
      ogImageUrl, 
      liveUrl,
      workspace,
      type,
      priority,
      pinned,
      confidenceLevel,
      effortEstimate,
      potentialImpact,
      stage,
      githubUrl,
      folderPath
    } = body;

    let finalOgImageUrl = ogImageUrl;
    if (!finalOgImageUrl && (liveUrl || githubUrl)) {
      const targetUrl = liveUrl || githubUrl;
      const favicon = getFaviconUrl(targetUrl);
      if (favicon) {
        finalOgImageUrl = favicon;
      }
    }

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(phase !== undefined && { phase }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(finalOgImageUrl !== undefined && { ogImageUrl: finalOgImageUrl }),
        ...(liveUrl !== undefined && { liveUrl }),
        ...(workspace !== undefined && { workspace }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(pinned !== undefined && { pinned }),
        ...(confidenceLevel !== undefined && { confidenceLevel }),
        ...(effortEstimate !== undefined && { effortEstimate }),
        ...(potentialImpact !== undefined && { potentialImpact }),
        ...(stage !== undefined && { stage }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(folderPath !== undefined && { folderPath }),
      },
    });

    // Auto-fetch OG image if liveUrl is set and ogImageUrl is still empty
    if (updatedProject.liveUrl && !updatedProject.ogImageUrl) {
      const fetchedOg = await fetchOGImage(updatedProject.liveUrl);
      if (fetchedOg) {
        const final = await prisma.project.update({
          where: { id },
          data: { ogImageUrl: fetchedOg },
        });
        return NextResponse.json(final);
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
