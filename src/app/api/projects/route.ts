import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const defaultProjects = [
  {
    name: "DevOS Dashboard",
    description: "A customizable, draggable developer cockpit dashboard to centralize workflow and reduce context switching.",
    status: "active",
    tags: ["Next.js", "React Grid Layout", "Tailwind CSS", "Zustand"],
    githubUrl: "https://github.com/coderkavyag/wake-up",
    liveUrl: "http://localhost:3000",
    summary: "A next-generation developer spatial operating cockpit that integrates widget layouts, tasks lists, real-time GitHub activity streams, and developer memory systems.",
    architectureNotes: "### Core Architecture\n\n- **Client Layer**: Next.js App Router with Zustand client-side optimistic orchestration.\n- **Spatial Layout**: React-Grid-Layout dragging and resizing persistent coordinates.\n- **Database Layer**: PostgreSQL Neon Serverless pooling singleton via Prisma 7.",
    resumeBullet: "Engineered and orchestrated a high-performance Next.js developer spatial cockpit, improving solo-builder workflow velocity by 40% through unified workspace widgets.",
    nextAction: "Integrate mock mock technical Q&A preparation features.",
    completionPercentage: 85,
    projectHealth: 95.0,
    momentumScore: 90.0
  },
  {
    name: "WebRTC Stranger Chat",
    description: "Multi-user real-time stranger video chat using TURN relay server infrastructure and ICE restart negotiation.",
    status: "completed",
    tags: ["WebRTC", "Express", "Socket.io", "React"],
    githubUrl: "https://github.com/example/webrtc-chat",
    summary: "High-concurrency video signaling chat application running behind TURN relays with robust ICE recovery logic.",
    architectureNotes: "### WebRTC Pipeline\n\n- **Signaling Server**: Express with Socket.io coordination.\n- **TURN Provider**: Metered.live secure REST API dynamic credentialing.\n- **ICE Recovery**: Client-side state listener triggering renegotiation on disconnect.",
    resumeBullet: "Architected a real-time stranger video chat platform with WebRTC & Socket.io, eliminating 95% of peer connectivity drops via custom ICE restart mechanics.",
    nextAction: "Finalize production deployment logs auditing.",
    completionPercentage: 100,
    projectHealth: 100.0,
    momentumScore: 80.0
  },
  {
    name: "Editorial News Scraper",
    description: "A strict quota-based RSS editorial scraping platform with automated category tagging.",
    status: "stale",
    tags: ["Python", "BeautifulSoup", "PostgreSQL", "Redis"],
    githubUrl: "https://github.com/example/news-scraper",
    summary: "Scheduled RSS scraper keeping top 60 aggregate posts with AI and tools category indexing.",
    architectureNotes: "### Aggregation Engine\n\n- **Scraper**: BeautifulSoup scheduled worker.\n- **Cache**: Redis event caching.\n- **Database**: PostgreSQL data storage.",
    resumeBullet: "Built a scheduled editorial aggregator in Python, filtering over 1,000+ daily RSS feeds into 60 high-quality slots utilizing Redis caching.",
    nextAction: "Restore Redis URL backend settings.",
    completionPercentage: 70,
    projectHealth: 60.0,
    momentumScore: 40.0
  }
];

export async function GET() {
  try {
    let projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Auto-seed default projects if the database table is completely empty!
    if (projects.length === 0) {
      await prisma.project.createMany({
        data: defaultProjects
      });
      projects = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(projects);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, tags, githubUrl, liveUrl } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        status: status || "active",
        tags: tags || [],
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        projectHealth: 100.0,
        momentumScore: 0.0,
        completionPercentage: 0.0,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
