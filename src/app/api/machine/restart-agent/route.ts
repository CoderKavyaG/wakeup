import { NextResponse } from "next/server";
import { auth } from "@/auth";
import cp from 'child_process';
import os from 'os';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Attempt to kill existing agent gracefully if endpoint exists
    await fetch("http://127.0.0.1:3131/kill", { method: "POST" }).catch(() => {});
    
    // 1. Kill any process listening on 3131 (the agent)
    const isWin = os.platform() === 'win32';
    const killCmd = isWin 
      ? `FOR /F "tokens=5" %a in ('netstat -aon ^| findstr :3131') do taskkill /F /PID %a`
      : `lsof -ti:3131 | xargs kill -9`;
      
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
