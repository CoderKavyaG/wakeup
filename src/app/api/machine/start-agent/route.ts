import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST() {
  try {
    const agentDir = "C:\\Users\\Kavya\\Projects\\wakeup\\devos-agent";
    
    // Spawn the agent in the background detached so it persists
    const args = ["index.js"];
    const child = spawn("node", args, {
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
