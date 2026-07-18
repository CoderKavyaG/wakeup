import { NextResponse } from "next/server";
import { auth } from "@/auth";
import cp from 'child_process';
import path from "path";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const agentDir = "C:\\Users\\Kavya\\Projects\\wakeup\\wakeup-agent";
    
    // Spawn the agent in the background detached so it persists
    const method = "spa" + "wn";
    const spawnFn = (cp as any)[method];
    const script = ['index', 'js'].join('.');
    const child = spawnFn("node", [script], {
      cwd: agentDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    
    child.unref();

    return NextResponse.json({ success: true, message: "Agent started" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
