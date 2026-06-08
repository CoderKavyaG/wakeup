import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: "task" | "project-milestone" | "deadline";
  url?: string;
  status: "pending" | "in-progress" | "completed";
}

// Generate iCalendar format (.ics)
function generateICS(events: CalendarEvent[]): string {
  const now = new Date();
  const uid = `wakeup-${Date.now()}@devos`;

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DevOS//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:DevOS Calendar
X-WR-TIMEZONE:UTC
CREATED:${formatDateISO8601(now)}
LAST-MODIFIED:${formatDateISO8601(now)}
`;

  events.forEach((event) => {
    const eventUid = `${event.id}-${uid}`;
    const status = event.status === "completed" ? "COMPLETED" : event.status === "in-progress" ? "IN-PROCESS" : "TODO";

    ics += `
BEGIN:VEVENT
UID:${eventUid}
DTSTAMP:${formatDateISO8601(now)}
DTSTART:${formatDateISO8601(event.startTime)}
DTEND:${formatDateISO8601(event.endTime)}
SUMMARY:${escapeICSString(event.title)}
DESCRIPTION:${escapeICSString(event.description || event.category)}
STATUS:${status}
CATEGORIES:${event.category}`;

    if (event.url) {
      ics += `\nURL:${event.url}`;
    }

    ics += `\nEND:VEVENT\n`;
  });

  ics += `END:VCALENDAR`;
  return ics;
}

function formatDateISO8601(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function escapeICSString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "ics"; // ics or json
    const includeCompleted = searchParams.get("includeCompleted") === "true";

    const events: CalendarEvent[] = [];

    // 1. Fetch tasks as calendar events
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { dueDate: "asc" },
    });

    tasks.forEach((task) => {
      if (!includeCompleted && task.completed) return;

      const startTime = new Date();
      const endTime = task.dueDate ? new Date(task.dueDate) : new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

      events.push({
        id: `task-${task.id}`,
        title: task.title,
        description: `Priority: ${task.priority}`,
        startTime,
        endTime,
        category: "task",
        status: task.completed ? "completed" : "pending",
      });
    });

    // 2. Fetch projects and create milestones
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    projects.forEach((project) => {
      const startTime = new Date(project.createdAt);
      const endTime = new Date(project.updatedAt);

      events.push({
        id: `project-${project.id}`,
        title: `Project: ${project.name}`,
        description: project.description || `Status: ${project.status}`,
        startTime,
        endTime,
        category: "project-milestone",
        url: project.liveUrl || project.githubUrl || undefined,
        status: project.status === "completed" ? "completed" : project.status === "active" ? "in-progress" : "pending",
      });
    });

    // Sort by date
    events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (format === "json") {
      return NextResponse.json({
        events,
        count: events.length,
        generated: new Date().toISOString(),
      });
    } else {
      // Return ICS format
      const ics = generateICS(events);
      return new NextResponse(ics, {
        headers: {
          "Content-Type": "text/calendar",
          "Content-Disposition": "attachment; filename=devos-calendar.ics",
        },
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Calendar sync error";
    console.error("Calendar sync error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { action, provider, credentials } = body;

    // Future integration points for:
    // - Google Calendar API (provider: "google")
    // - Outlook Calendar API (provider: "outlook")
    // - Slack reminders (provider: "slack")
    // - Email digest (provider: "email")

    if (action === "sync" && provider === "google") {
      // Placeholder for Google Calendar sync
      return NextResponse.json({
        success: true,
        message: "Google Calendar sync scheduled",
        provider,
      });
    }

    return NextResponse.json(
      { error: "Provider or action not supported" },
      { status: 400 }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Calendar sync error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
