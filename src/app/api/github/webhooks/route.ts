import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// Verify GitHub webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
  if (!secret) {
    console.warn("GITHUB_WEBHOOK_SECRET not configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

interface GithubWebhookPayload {
  action?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description?: string;
    updated_at: string;
  };
  pull_request?: {
    id: number;
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
  };
  issue?: {
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
  };
  push?: {
    ref: string;
    before: string;
    after: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: { name: string; email: string };
  }>;
  sender?: {
    login: string;
    avatar_url: string;
  };
}

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      console.warn("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload: GithubWebhookPayload = JSON.parse(rawBody);
    const eventType = request.headers.get("x-github-event");

    // Process different webhook event types
    if (eventType === "push" && payload.repository) {
      await handlePushEvent(payload);
    } else if (eventType === "pull_request" && payload.pull_request) {
      await handlePullRequestEvent(payload);
    } else if (eventType === "issues" && payload.issue) {
      await handleIssueEvent(payload);
    } else if (eventType === "repository") {
      await handleRepositoryEvent(payload);
    }

    return NextResponse.json({ success: true, event: eventType });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Webhook processing error";
    console.error("Webhook error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function handlePushEvent(payload: GithubWebhookPayload) {
  if (!payload.repository) return;

  const project = await prisma.project.findFirst({
    where: { githubUrl: payload.repository.html_url },
  });

  if (!project) return;

  // Update project's last updated timestamp
  await prisma.project.update({
    where: { id: project.id },
    data: {
      updatedAt: new Date(),
      status: payload.repository.updated_at ? "active" : project.status,
    },
  });

  // Create or update a note about the push
  const commitCount = payload.commits?.length || 0;
  if (commitCount > 0) {
    const commitMessages = payload.commits
      ?.map((c) => `• ${c.message.split("\n")[0]}`)
      .join("\n") || "";

    const noteContent = `🔄 Push to ${payload.repository.name}: ${commitCount} commit${commitCount > 1 ? "s" : ""}\n${commitMessages}`;

    await prisma.note.create({
      data: {
        content: noteContent,
        projectId: project.id,
        userId: project.userId,
      },
    });
  }
}

async function handlePullRequestEvent(payload: GithubWebhookPayload) {
  if (!payload.repository || !payload.pull_request) return;

  const project = await prisma.project.findFirst({
    where: { githubUrl: payload.repository.html_url },
  });

  if (!project) return;

  const pr = payload.pull_request;
  const action = payload.action || "updated";

  // Create a note about PR activity
  const noteContent = `📋 PR #${pr.number} ${action}: ${pr.title}\nStatus: ${pr.state}\n${pr.html_url}`;

  await prisma.note.create({
    data: {
      content: noteContent,
      projectId: project.id,
      userId: project.userId,
    },
  });

  // If PR is merged/closed, potentially create tasks
  if (action === "closed" && pr.state === "closed") {
    // Check if this was a merge by looking at the note
    await prisma.project.update({
      where: { id: project.id },
      data: { updatedAt: new Date() },
    });
  }
}

async function handleIssueEvent(payload: GithubWebhookPayload) {
  if (!payload.repository || !payload.issue) return;

  const project = await prisma.project.findFirst({
    where: { githubUrl: payload.repository.html_url },
  });

  if (!project) return;

  const issue = payload.issue;
  const action = payload.action || "updated";

  // Create a note about issue activity
  const noteContent = `⚠️ Issue #${issue.number} ${action}: ${issue.title}\nStatus: ${issue.state}\n${issue.html_url}`;

  await prisma.note.create({
    data: {
      content: noteContent,
      projectId: project.id,
      userId: project.userId,
    },
  });

  // If issue is opened, optionally create a task
  if (action === "opened") {
    const existingTask = await prisma.task.findFirst({
      where: { title: { contains: issue.title }, userId: project.userId },
    });

    if (!existingTask) {
      await prisma.task.create({
        data: {
          title: `GitHub Issue: ${issue.title}`,
          priority: "medium",
          completed: issue.state === "closed",
          dueDate: null,
          projectId: project.id,
          userId: project.userId,
        },
      });
    }
  }
}

async function handleRepositoryEvent(payload: GithubWebhookPayload) {
  if (!payload.repository) return;

  const project = await prisma.project.findFirst({
    where: { githubUrl: payload.repository.html_url },
  });

  if (!project) return;

  const action = payload.action || "updated";

  // Track repository metadata changes
  const noteContent = `🏗️ Repository ${action}: ${payload.repository.name}\n${payload.repository.description || "No description"}\n${payload.repository.html_url}`;

  await prisma.note.create({
    data: {
      content: noteContent,
      projectId: project.id,
      userId: project.userId,
    },
  });
}
