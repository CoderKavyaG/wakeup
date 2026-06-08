import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const layoutId = `global-layout-${userId}`;

    const layoutState = await prisma.layoutState.findUnique({
      where: { id: layoutId },
    });
    
    if (!layoutState) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json(layoutState);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const layoutId = `global-layout-${userId}`;

    const body = await request.json();
    const { layouts, widgets } = body;

    const layoutState = await prisma.layoutState.upsert({
      where: { id: layoutId },
      update: {
        layouts: layouts || {},
        widgets: widgets || [],
      },
      create: {
        id: layoutId,
        layouts: layouts || {},
        widgets: widgets || [],
        userId,
      },
    });

    return NextResponse.json(layoutState);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
