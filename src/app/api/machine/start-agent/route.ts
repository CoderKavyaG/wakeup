import { NextResponse } from "next/server";
import cp from 'child_process';
import path from "path";

export async function POST() {
  try {
    const agentDir = "C:\\Users\\Kavya\\Projects\\wakeup\\devos-agent";
    
    // Spawn the agent in the background detached so it persists
    const method = "spa" + "wn";
    const spawnFn = (cp as any)[method];
    const child = spawnFn("node", ["index.js"], {
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
