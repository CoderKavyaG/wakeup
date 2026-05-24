import { NextResponse } from "next/server";
import net from "net";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execPromise = promisify(exec);

const checkPort = (port: number, host: string = "127.0.0.1"): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 150; // fast check
    
    socket.setTimeout(timeout);
    
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
};

const getDockerContainers = async () => {
  try {
    const { stdout } = await execPromise('docker ps --format "{{.Names}}|{{.Image}}|{{.Status}}"');
    return stdout.trim().split("\n").filter(Boolean).map(line => {
      const [name, image, status] = line.split("|");
      return { name, image, status };
    });
  } catch (e) {
    return []; // Docker is either not installed or not running
  }
};

const getPortTechnology = (port: number): string => {
  switch (port) {
    case 3000: return "Next.js / Node Server (Self)";
    case 3001: return "Next.js Dev Server (Secondary)";
    case 3002: return "React App / Express API";
    case 5000: return "Flask / Express Backend";
    case 5173: return "Vite Dev Server (React/Vue)";
    case 8000: return "Django / FastAPI Server";
    case 8080: return "Spring Boot / Java Web Server";
    case 27017: return "MongoDB Local Instance";
    case 5432: return "PostgreSQL Local Instance";
    case 6379: return "Redis Cache Server";
    default: return "Unknown Local Server";
  }
};

export async function GET() {
  try {
    // 1. Port scanning
    const portsToScan = [3000, 3001, 3002, 5000, 5173, 8000, 8080, 27017, 5432, 6379];
    const activePorts: any[] = [];

    const scanPromises = portsToScan.map(async (port) => {
      const isOpen = await checkPort(port);
      if (isOpen) {
        activePorts.push({
          port,
          technology: getPortTechnology(port),
          url: `http://localhost:${port}`
        });
      }
    });

    await Promise.all(scanPromises);

    // 2. Docker container scan
    const containers = await getDockerContainers();

    // 3. Workspace folder details
    const workspacePath = process.cwd();
    const workspaceName = path.basename(workspacePath);
    let recentFiles: string[] = [];

    try {
      // Read workspace files
      const files = fs.readdirSync(workspacePath);
      recentFiles = files.filter(f => !f.startsWith(".") && f !== "node_modules" && f !== ".next").slice(0, 5);
    } catch (e) {
      console.warn("Could not read workspace files:", e);
    }

    return NextResponse.json({
      workspace: {
        path: workspacePath,
        name: workspaceName,
        contents: recentFiles
      },
      activePorts: activePorts.sort((a, b) => a.port - b.port),
      dockerContainers: containers,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
