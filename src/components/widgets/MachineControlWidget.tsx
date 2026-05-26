"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, Server, FolderCode, Folder, File, Code2, 
  ExternalLink, CheckCircle2, Play, RefreshCw, XCircle,
  Activity, Cpu, MemoryStick, GitBranch as GitBranchIcon, FileText, ClipboardCopy
} from "lucide-react";

interface FileItem {
  name: string;
  isDirectory: boolean;
}

const KNOWN_PORTS: Record<number, string> = {
  3000: "Next.js / Node",
  3001: "API Server",
  4000: "Express",
  5000: "Flask / Server",
  5432: "PostgreSQL",
  6379: "Redis",
  27017: "MongoDB",
  8000: "Python Server",
  8080: "Generic Server"
};

export function MachineControlWidget() {
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [ports, setPorts] = useState<number[]>([]);
  
  const [customLaunchers, setCustomLaunchers] = useState<{name: string, command: string}[]>([
    { name: "DevOS Project", command: "VS Code" },
    { name: "PostgreSQL", command: "postgres" },
    { name: "Restart Agent", command: "RESTART_AGENT" },
    { name: "Open Terminal Here", command: "Terminal" },
    { name: "Copy .env Path", command: "COPY_ENV" }
  ]);
  const [isEditingLaunchers, setIsEditingLaunchers] = useState(false);
  
  const [filesLoading, setFilesLoading] = useState(false);
  const [portsLoading, setPortsLoading] = useState(false);
  
  const [agentOffline, setAgentOffline] = useState(false);

  // Live Stats State
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  const [gitInfo, setGitInfo] = useState({ branch: "", commit: "" });

  // Responsive Layout State
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isShort, setIsShort] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isTinyWidth, setIsTinyWidth] = useState(false);

  // Load saved workspace on mount
  useEffect(() => {
    const saved = localStorage.getItem("DEVOS_WORKSPACE");
    if (saved) {
      setWorkspacePath(saved);
      fetchFiles(saved);
    }
    
    const savedLaunchers = localStorage.getItem("DEVOS_LAUNCHERS");
    if (savedLaunchers) {
      try { setCustomLaunchers(JSON.parse(savedLaunchers)); } catch {}
    }

    fetchPorts();
    
    // Auto refresh ports every 10 seconds
    const portInterval = setInterval(fetchPorts, 10000);
    
    // Poll stats every 5 seconds
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/machine/stats");
        if (res.ok) setStats(await res.json());
      } catch {}
    };
    fetchStats();
    const statsInterval = setInterval(fetchStats, 5000);

    return () => {
      clearInterval(portInterval);
      clearInterval(statsInterval);
    };
  }, []);

  // Fetch Git info when workspacePath changes
  useEffect(() => {
    if (!workspacePath) return;
    const fetchGit = async () => {
      try {
        const res = await fetch(`/api/machine/git?path=${encodeURIComponent(workspacePath)}`);
        if (res.ok) setGitInfo(await res.json());
      } catch {}
    };
    fetchGit();
  }, [workspacePath]);

  // ResizeObserver for Container Queries
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setIsCollapsed(entry.contentRect.width < 400);
        setIsNarrow(entry.contentRect.width < 380);
        setIsTinyWidth(entry.contentRect.width < 300);
        setIsShort(entry.contentRect.height < 250);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchFiles = async (path: string) => {
    if (!path) return;
    setFilesLoading(true);
    setAgentOffline(false);
    try {
      const res = await fetch(`/api/machine/files?path=${encodeURIComponent(path)}`);
      if (res.status === 503) {
        setAgentOffline(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        setFiles([]);
      }
    } catch {
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const fetchPorts = async () => {
    setPortsLoading(true);
    setAgentOffline(false);
    try {
      const res = await fetch(`/api/machine/ports`);
      if (res.status === 503) {
        setAgentOffline(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter out annoying Windows system ports to keep it clean for dev
        const filtered = data.filter((p: number) => p >= 3000 && p < 40000);
        setPorts(filtered);
      }
    } catch {
      // ignore
    } finally {
      setPortsLoading(false);
    }
  };

  const handleSaveWorkspace = () => {
    localStorage.setItem("DEVOS_WORKSPACE", workspacePath);
    setIsEditingPath(false);
    fetchFiles(workspacePath);
  };

  const handleOpenVSCode = async () => {
    if (!workspacePath) return;
    try {
      await fetch(`/api/machine/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: workspacePath, app: "vscode" })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunch = async (command: string) => {
    if (command === "COPY_ENV") {
      if (!workspacePath) return;
      const envPath = `${workspacePath}\\.env.local`.replace(/\\\\/g, "\\");
      navigator.clipboard.writeText(envPath);
      return;
    }
    
    if (command === "RESTART_AGENT") {
      try {
        await fetch("/api/machine/restart-agent", { method: "POST" });
        setAgentOffline(true);
        setTimeout(fetchPorts, 2000); // Check if it came back
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!workspacePath) return alert("Please set a workspace path first.");
    try {
      await fetch(`/api/machine/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: command, cwd: workspacePath }) // pass cwd if API supports it
      });
    } catch (e) {
      console.error(e);
    }
  };

  const saveLaunchers = (launchers: {name: string, command: string}[]) => {
    setCustomLaunchers(launchers);
    localStorage.setItem("DEVOS_LAUNCHERS", JSON.stringify(launchers));
  };

  return (
    <div className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl overflow-hidden divide-y divide-border/40">
      
      {/* ── HEADER ── */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between bg-[#0f0f11]">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Machine Control</h3>
        </div>
        {agentOffline ? (
          <Badge variant="outline" className="text-[9px] uppercase border-red-500/20 text-red-400 bg-red-500/10">
            Agent Offline
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] uppercase border-green-500/20 text-green-500 bg-green-500/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Agent Connected
          </Badge>
        )}
      </div>

      {/* ── STATS BAR ── */}
      <div className="px-3 py-1.5 shrink-0 bg-[#161618] border-b border-border/40 flex items-center gap-3 overflow-x-auto custom-scrollbar whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
          <Cpu className="w-3 h-3 text-blue-400" /> CPU: {stats.cpu}%
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
          <MemoryStick className="w-3 h-3 text-purple-400" /> RAM: {stats.ram}%
        </div>
        {gitInfo.branch && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
            <GitBranchIcon className="w-3 h-3 text-orange-400" /> {gitInfo.branch}
          </div>
        )}
        {gitInfo.commit && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[200px]">
            <FileText className="w-3 h-3 text-emerald-400 shrink-0" /> <span className="truncate">{gitInfo.commit.substring(0, 40)}{gitInfo.commit.length > 40 ? "..." : ""}</span>
          </div>
        )}
      </div>

      <div ref={containerRef} className={`flex-1 flex divide-border/40 ${isNarrow ? "flex-col divide-y overflow-y-auto custom-scrollbar" : "flex-row divide-x overflow-hidden"}`}>
        
        {/* ── SECTION 1: WORKSPACE ── */}
        <div className={`flex flex-col bg-[#0f0f11] ${isNarrow ? "shrink-0" : "flex-1 min-h-0"}`}>
          <div className="p-3 shrink-0 border-b border-white/10 bg-[#0f0f11] flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <FolderCode className="w-3.5 h-3.5" /> Workspace
            </div>
            {!isEditingPath && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setIsEditingPath(true)}>
                Change
              </Button>
            )}
          </div>
          
          <div className="p-3 shrink-0">
            {isEditingPath || !workspacePath ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input 
                    value={workspacePath}
                    onChange={e => setWorkspacePath(e.target.value)}
                    placeholder="Enter absolute path (e.g. C:\Users\...)"
                    className="h-7 text-xs bg-[#0f0f11] border-white/10"
                  />
                  <Button size="sm" className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSaveWorkspace}>Save</Button>
                </div>
                {!workspacePath && (
                  <span className="text-[10px] text-orange-400/80 italic">You must enter and save your project's folder path above to enable Git & file tracking.</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-mono text-muted-foreground break-all bg-black/20 p-1.5 rounded border border-white/10">
                  {workspacePath}
                </div>
                <Button size="sm" variant="secondary" className="h-7 text-xs w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20" onClick={handleOpenVSCode} disabled={agentOffline}>
                  <Code2 className="w-3.5 h-3.5 mr-1.5" /> Open in VS Code
                </Button>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <ScrollArea className="flex-1 px-3 pb-3">
              {filesLoading ? (
                <div className="text-center text-muted-foreground text-xs py-4 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                </div>
              ) : files.length > 0 ? (
                <div className="space-y-0.5 mt-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-white/5 font-mono text-muted-foreground">
                      {f.isDirectory ? <Folder className="w-3 h-3 text-blue-400 shrink-0" /> : <File className="w-3 h-3 text-slate-500 shrink-0" />}
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground/50 text-[10px] py-4 uppercase tracking-widest">
                  No files found
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* ── SECTION 2 & 3 CONTAINER ── */}
        <div className={`flex flex-col bg-[#0f0f11] ${isNarrow ? "shrink-0" : "flex-1 min-h-0"}`}>
          
          {/* SECTION 2: PORTS & PROCESSES */}
          <div className={`flex flex-col border-b border-white/10 ${isNarrow ? "shrink-0" : "flex-1 min-h-0"}`}>
            <div className="p-3 shrink-0 border-b border-white/10 bg-[#0f0f11] flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Ports
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={fetchPorts} disabled={portsLoading || agentOffline}>
                <RefreshCw className={`w-3 h-3 text-muted-foreground ${portsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-1.5">
                {ports.length > 0 ? (
                  ports.map(port => {
                    const isHttp = [3000, 3001, 8080, 4000, 5000].includes(port);
                    return (
                      <div key={port} className="flex items-center justify-between p-2 rounded-lg border border-white/10 bg-black/20 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-2 h-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          <span className="text-xs font-bold font-mono w-10 shrink-0 text-foreground">{port}</span>
                          {!isCollapsed && (
                            <Badge variant="outline" className="text-[9px] uppercase border-white/10 text-muted-foreground font-mono px-1.5 py-0 h-4 truncate">
                              {KNOWN_PORTS[port] || "Service"}
                            </Badge>
                          )}
                        </div>
                        {isHttp && !isCollapsed && (
                          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 hover:bg-primary/20 hover:text-primary rounded-md" onClick={() => window.open(`http://localhost:${port}`, '_blank')}>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground/50 text-[10px] py-4 uppercase tracking-widest">
                    No active ports detected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* SECTION 3: QUICK LAUNCHERS */}
          {!isShort && (
            <div className="shrink-0 p-3 bg-[#0f0f11] border-t border-white/10">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> Quick Launch</span>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-muted-foreground" onClick={() => setIsEditingLaunchers(!isEditingLaunchers)}>
                {isEditingLaunchers ? "Done" : "Config"}
              </Button>
            </div>
            
            {isEditingLaunchers ? (
              <div className="space-y-2">
                {customLaunchers.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={l.name} onChange={(e) => {
                      const newL = [...customLaunchers];
                      newL[i].name = e.target.value;
                      saveLaunchers(newL);
                    }} placeholder="Name" className="h-7 text-xs w-1/3" />
                    <Input value={l.command} onChange={(e) => {
                      const newL = [...customLaunchers];
                      newL[i].command = e.target.value;
                      saveLaunchers(newL);
                    }} placeholder="Terminal command..." className="h-7 text-xs flex-1" />
                    <Button variant="destructive" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                      const newL = customLaunchers.filter((_, idx) => idx !== i);
                      saveLaunchers(newL);
                    }}><XCircle className="w-3 h-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-7 w-full text-xs border-dashed" onClick={() => {
                  saveLaunchers([...customLaunchers, { name: "New App", command: "" }]);
                }}>+ Add Launcher</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {customLaunchers.map((l, i) => (
                  <Button key={i} variant="outline" size="sm" className={`h-8 text-[10px] bg-[#0f0f11] hover:bg-white/5 border-white/10 ${isTinyWidth ? "justify-center" : "justify-start"}`} onClick={() => handleLaunch(l.command)} disabled={agentOffline}>
                    <Terminal className={`w-3 h-3 ${isTinyWidth ? "" : "mr-2"} text-primary`} /> {!isTinyWidth && l.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
          )}

        </div>
      </div>
    </div>
  );
}
