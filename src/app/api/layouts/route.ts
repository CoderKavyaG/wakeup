import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const layoutState = await prisma.layoutState.findUnique({
      where: { id: "global-layout" },
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
    const body = await request.json();
    const { layouts, widgets } = body;

    const layoutState = await prisma.layoutState.upsert({
      where: { id: "global-layout" },
      update: {
        layouts: layouts || {},
        widgets: widgets || [],
      },
      create: {
        id: "global-layout",
        layouts: layouts || {},
        widgets: widgets || [],
      },
    });

    return NextResponse.json(layoutState);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
