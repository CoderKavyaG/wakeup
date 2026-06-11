import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// ── OG metadata fetcher ──
async function fetchOGData(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { "User-Agent": "DevOS/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1]
                 || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)?.[1];
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1]
                 || html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i)?.[1]
                 || html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const ogDesc  = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1]
                 || html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i)?.[1]
                 || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
    return { ogImage: ogImage || null, ogTitle: ogTitle || null, ogDesc: ogDesc || null };
  } catch {
    return { ogImage: null, ogTitle: null, ogDesc: null };
  }
}

// GET /api/projects/[id]/media — list media items
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const media = await prisma.mediaItem.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

// POST /api/projects/[id]/media
// Accepts either:
//   - multipart/form-data with file(s) + type field
//   - JSON with { url, type, title?, description? } for link previews / external URLs
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    // ── File upload (multipart/form-data) ──
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData.getAll("files") as File[];
      const type = (formData.get("type") as string) || "image";

      if (!files || files.length === 0) {
        return NextResponse.json({ error: "No files provided" }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", userId, id);
      await mkdir(uploadDir, { recursive: true });

      const created = [];
      for (const file of files) {
        // Sanitize filename
        const ext = path.extname(file.name) || ".png";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        const filePath = path.join(uploadDir, safeName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        const publicUrl = `/uploads/${userId}/${id}/${safeName}`;

        const media = await prisma.mediaItem.create({
          data: {
            type,
            url: publicUrl,
            title: file.name,
            mimeType: file.type || null,
            sizeBytes: buffer.length,
            projectId: id,
            userId,
          },
        });
        created.push(media);
      }

      return NextResponse.json(created.length === 1 ? created[0] : created);
    }

    // ── JSON body (link preview / external URL) ──
    const body = await request.json();
    const { type, url, title, description } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // For link previews, fetch OG metadata
    if (type === "link_preview") {
      const og = await fetchOGData(url);
      const media = await prisma.mediaItem.create({
        data: {
          type: "link_preview",
          url,
          thumbnailUrl: og.ogImage,
          title: og.ogTitle || title || url,
          description: og.ogDesc || description || null,
          projectId: id,
          userId,
        },
      });
      return NextResponse.json(media);
    }

    // Standard external URL
    const media = await prisma.mediaItem.create({
      data: {
        type: type || "image",
        url,
        title: title || null,
        description: description || null,
        projectId: id,
        userId,
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create media item";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/media?mediaId=X — delete media item + file on disk
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Get the item first so we can delete the file
    const item = await prisma.mediaItem.findUnique({ where: { id: mediaId } });
    if (!item || item.projectId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete file from disk if it's a local upload
    if (item.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", item.url);
      try { await unlink(filePath); } catch {}
    }

    await prisma.mediaItem.delete({ where: { id: mediaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
  }
}
