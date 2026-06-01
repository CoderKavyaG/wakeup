import { NextResponse } from "next/server";

import { exec, spawn } from "child_process";
import path from "path";

export async function POST() {
  try {
    // Attempt to kill existing agent gracefully if endpoint exists
    await fetch("http://127.0.0.1:3131/kill", { method: "POST" }).catch(() => {});
    
    // Also try to forcefully kill process on port 3131 on Windows
    exec("netstat -ano | findstr :3131", (error, stdout) => {
      if (stdout) {
        const lines = stdout.split('\n');
        lines.forEach(l => {
          if (l.includes('LISTENING') && l.includes(':3131')) {
            const parts = l.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              if (pid !== '0') exec(`taskkill /F /PID ${pid}`);
            }
          }
        });
      }
      
      // Wait for process to die, then start new agent
      setTimeout(() => {
        const agentDir = "C:\\Users\\Kavya\\Projects\\wakeup\\devos-agent";
        const child = spawn("node", ["index.js"], {
          cwd: agentDir,
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        child.unref();
      }, 1000);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to restart agent" }, { status: 503 });
  }
}
