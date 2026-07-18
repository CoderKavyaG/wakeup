import { NextResponse } from "next/server";
import { auth } from "@/auth";
import cp from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { agentFetch } from "@/lib/agentFetch";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    let activePort = 3131;
    try {
      const portFilePath = path.join(process.cwd(), "devos-agent", "active-port.json");
      if (fs.existsSync(portFilePath)) {
        const content = fs.readFileSync(portFilePath, "utf8");
        const data = JSON.parse(content);
        if (data && typeof data.port === "number") {
          activePort = data.port;
        }
      }
    } catch (e) {}

    // Attempt to kill existing agent gracefully if endpoint exists
    await agentFetch("/restart", { method: "POST" }).catch(() => {});
    
    // 1. Kill any process listening on the active port (the agent)
    const isWin = os.platform() === 'win32';
    const killCmd = isWin 
      ? `FOR /F "tokens=5" %a in ('netstat -aon ^| findstr :${activePort}') do taskkill /F /PID %a`
      : `lsof -ti:${activePort} | xargs kill -9`;
      
    cp.exec(killCmd, (error) => {
      // It's okay if error occurs (port might not be in use yet)
      
      // Wait for process to die, then start new agent
      setTimeout(() => {
        const agentDir = "C:\\Users\\Kavya\\Projects\\wakeup\\devos-agent";
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
      }, 1000);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to restart agent" }, { status: 503 });
  }
}
