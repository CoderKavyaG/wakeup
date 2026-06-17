import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

// POST /api/auth/token — Save (encrypt) tokens
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Check if user exists to handle stale sessions (e.g. database reset/migration)
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      return NextResponse.json({
        error: "Your session is stale (User account not found in database). Please sign out and sign back in to register your account on the new database."
      }, { status: 404 });
    }

    const body = await request.json();
    const { githubToken, vercelToken, groqApiKey, openrouterApiKey } = body;
    
    const updateData: any = {};
    if (githubToken !== undefined) {
      updateData.githubToken = githubToken ? encrypt(githubToken) : null;
    }
    if (vercelToken !== undefined) {
      updateData.vercelToken = vercelToken ? encrypt(vercelToken) : null;
    }
    if (groqApiKey !== undefined) {
      updateData.groqApiKey = groqApiKey ? encrypt(groqApiKey) : null;
    }
    if (openrouterApiKey !== undefined) {
      updateData.openrouterApiKey = openrouterApiKey ? encrypt(openrouterApiKey) : null;
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/auth/token — Check if tokens exist (never returns plaintext)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    return NextResponse.json({
      hasGithubToken: !!user?.githubToken,
      hasVercelToken: !!user?.vercelToken,
      hasGroqApiKey: !!user?.groqApiKey,
      hasOpenrouterApiKey: !!user?.openrouterApiKey
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/auth/token?type=github|vercel|groq|openrouter — Delete a token
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Check if user exists to handle stale sessions (e.g. database reset/migration)
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      return NextResponse.json({
        error: "Your session is stale (User account not found in database). Please sign out and sign back in to register your account on the new database."
      }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "github" | "vercel" | "groq" | "openrouter"
    
    const allowedTypes = ["github", "vercel", "groq", "openrouter"];
    if (!type || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid token type" }, { status: 400 });
    }
    
    let field = "";
    if (type === "github") field = "githubToken";
    else if (type === "vercel") field = "vercelToken";
    else if (type === "groq") field = "groqApiKey";
    else if (type === "openrouter") field = "openrouterApiKey";
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        [field]: null
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
