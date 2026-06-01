import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST() {
  try {
    // The devos-agent folder is in the project root
    const agentDir = path.join(process.cwd(), "devos-agent");
    
    // Spawn the agent in the background detached so it persists
    const child = exec("node index.js", { cwd: agentDir }, (error) => {
      if (error) {
        console.error("Failed to start agent:", error);
      }
    });

    return NextResponse.json({ success: true, message: "Agent started" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
