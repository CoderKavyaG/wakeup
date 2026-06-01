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
  Activity, Cpu, MemoryStick, GitBranch as GitBranchIcon, FileText, ClipboardCopy, Power
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

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
    { name: "VS Code", command: "VS Code" },
    { name: "Terminal", command: "Terminal" },
    { name: "Docker", command: "Docker Desktop" },
    { name: "Restart Agent", command: "RESTART_AGENT" }
  ]);
  const [isEditingLaunchers, setIsEditingLaunchers] = useState(false);
  
  const [filesLoading, setFilesLoading] = useState(false);
  const [portsLoading, setPortsLoading] = useState(false);
  
  const [agentOffline, setAgentOffline] = useState(false);

  // Live Stats State
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  const [gitInfo, setGitInfo] = useState({ branch: "", commit: "" });

  const [gitRepos, setGitRepos] = useState<any[]>([]);
  const [gitReposLoading, setGitReposLoading] = useState(false);
  const [npmScripts, setNpmScripts] = useState<Record<string, string>>({});

  // Responsive Layout State
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isShort, setIsShort] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isTinyWidth, setIsTinyWidth] = useState(false);

  const { projects } = useProjectStore();
  const localProjects = projects.filter(p => p.folderPath).slice(0, 3);

  // Load saved workspace on mount
  useEffect(() => {
    const saved = localStorage.getItem("DEVOS_WORKSPACE");
    if (saved) {
      setWorkspacePath(saved);
      fetchFiles(saved);
      
      // Auto-register so it shows up in Repos list
      fetch("/api/machine/register-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: saved })
      }).then(() => fetchGitRepos());
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

  const fetchGitRepos = async () => {
    setGitReposLoading(true);
    try {
      const res = await fetch("/api/machine/git-status-all");
      if (res.ok) setGitRepos(await res.json());
    } catch {}
    setGitReposLoading(false);
  };

  useEffect(() => {
    fetchGitRepos();
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

    const fetchNpmScripts = async () => {
      try {
        const res = await fetch(`/api/machine/npm-scripts?path=${encodeURIComponent(workspacePath)}`);
        if (res.ok) {
          const data = await res.json();
          setNpmScripts(data.scripts || {});
        }
      } catch {}
    };
    fetchNpmScripts();
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
    
    // Auto-register so it shows up in Repos list
    fetch("/api/machine/register-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: workspacePath })
    }).then(() => fetchGitRepos());
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

  const handleStartAgent = async () => {
    try {
      await fetch("/api/machine/start-agent", { method: "POST" });
      setTimeout(fetchPorts, 2000);
    } catch (e) {}
  };

  const handleKillPort = async (port: number) => {
    try {
      await fetch("/api/machine/kill-port", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port }) 
      });
      setTimeout(fetchPorts, 1000);
    } catch (e) {}
  };

  return (
    <div className={`flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl overflow-hidden divide-y divide-border/40 transition-all duration-1000 ${agentOffline ? "shadow-[0_0_15px_rgba(239,68,68,0.15)] border border-red-500/20" : "shadow-[0_0_15px_rgba(34,197,94,0.08)] border border-green-500/20"}`}>
      
      {/* ── HEADER ── */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between bg-[#0f0f11]">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Machine Control</h3>
        </div>
        {agentOffline ? (
          <button onClick={handleStartAgent} className="text-[9px] uppercase border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <Power className="w-3 h-3" /> Start Agent
          </button>
        ) : (
          <Badge variant="outline" className="text-[9px] uppercase border-green-500/20 text-green-500 bg-green-500/10 flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
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
              <div className="flex flex-col gap-2 group relative">
                <div className="flex items-center justify-between bg-black/20 p-2 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="flex flex-col min-w-0 mr-2">
                    <span className="text-sm font-bold text-foreground truncate">{workspacePath.split('\\').pop() || workspacePath.split('/').pop() || "Workspace"}</span>
                    <span className="text-[9px] text-muted-foreground font-mono truncate" title={workspacePath}>{workspacePath}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-primary hover:bg-primary/20 rounded" onClick={handleOpenVSCode} disabled={agentOffline} title="Open in VS Code">
                    <Code2 className="w-4 h-4" />
                  </Button>
                </div>
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
              
              {!agentOffline && localProjects.length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Recent Local Scans</div>
                  <div className="space-y-1">
                    {localProjects.map(p => (
                      <div key={p.id} className="text-xs text-foreground/80 flex items-center justify-between p-1.5 bg-black/20 rounded hover:bg-white/5 cursor-pointer" onClick={() => { setWorkspacePath(p.folderPath!); handleSaveWorkspace(); }}>
                        <span className="truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-500 border-0">Scanned</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!agentOffline && workspacePath && Object.keys(npmScripts).length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <div className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider mb-2">NPM Scripts</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(npmScripts).map(script => (
                      <Button 
                        key={script}
                        variant="outline" 
                        size="sm"
                        className={`h-6 text-[10px] px-2 border-white/10 ${script === 'dev' || script === 'start' ? 'bg-primary text-primary-foreground font-bold hover:bg-primary/90' : 'bg-black/20 hover:bg-white/10 text-foreground'}`}
                        onClick={async () => {
                          const originalLaunchers = customLaunchers;
                          try {
                            await fetch("/api/machine/run-npm-script", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ path: workspacePath, script })
                            });
                          } catch(e) {}
                        }}
                      >
                        <Terminal className="w-3 h-3 mr-1" /> {script}
                      </Button>
                    ))}
                  </div>
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
                        <div className="flex items-center gap-1">
                          {isHttp && !isCollapsed && (
                            <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 hover:bg-primary/20 hover:text-primary rounded-md" onClick={() => window.open(`http://localhost:${port}`, '_blank')}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 hover:bg-red-500/20 hover:text-red-500 rounded-md" onClick={() => handleKillPort(port)} title="Kill Process">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
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
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar scrollbar-hide pr-1">
                {customLaunchers.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={l.name} onChange={(e) => {
                      const newL = [...customLaunchers];
                      newL[i].name = e.target.value;
                      saveLaunchers(newL);
                    }} placeholder="Name" className="h-7 text-xs w-1/3 bg-black/20" />
                    <Input value={l.command} onChange={(e) => {
                      const newL = [...customLaunchers];
                      newL[i].command = e.target.value;
                      saveLaunchers(newL);
                    }} placeholder="Command..." className="h-7 text-xs flex-1 bg-black/20" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-500/20 rounded" onClick={() => {
                      const newL = customLaunchers.filter((_, idx) => idx !== i);
                      saveLaunchers(newL);
                    }}><XCircle className="w-3 h-3" /></Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-[10px] border-dashed border-white/10 hover:bg-white/5" onClick={() => {
                    saveLaunchers([...customLaunchers, { name: "New App", command: "" }]);
                  }}>+ Add</Button>
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-[10px] border-dashed border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => {
                    saveLaunchers([
                      { name: "VS Code", command: "VS Code" },
                      { name: "Terminal", command: "Terminal" },
                      { name: "Docker", command: "Docker Desktop" },
                      { name: "Restart Agent", command: "RESTART_AGENT" }
                    ]);
                  }}>Reset Defaults</Button>
                </div>
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

          {/* SECTION 4: GIT REPOS */}
          {!isShort && (
            <div className="shrink-0 p-3 bg-[#0f0f11] border-t border-white/10">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><GitBranchIcon className="w-3.5 h-3.5" /> Repos</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground" onClick={fetchGitRepos} disabled={gitReposLoading || agentOffline}>
                  <RefreshCw className={`w-3 h-3 ${gitReposLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                {gitRepos.length > 0 ? (
                  gitRepos.map((repo, i) => (
                    <div key={i} className="flex flex-col gap-1 p-2 rounded-lg border border-white/10 bg-black/20 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setWorkspacePath(repo.path); handleSaveWorkspace(); }}>
                      <div className="flex items-center justify-between overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Folder className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="text-xs font-bold text-foreground truncate">{repo.name}</span>
                          {repo.branch && (
                            <Badge variant="outline" className="text-[8px] uppercase border-white/10 text-muted-foreground font-mono px-1.5 py-0 h-4 shrink-0">
                              {repo.branch}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {repo.uncommitted > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-amber-400 font-mono" title={`${repo.uncommitted} uncommitted`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {repo.uncommitted}
                            </div>
                          )}
                          {repo.ahead > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-blue-400 font-mono" title={`${repo.ahead} ahead`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {repo.ahead}
                            </div>
                          )}
                        </div>
                      </div>
                      {repo.lastCommit && (
                        <div className="text-[9px] font-mono text-muted-foreground truncate opacity-70">
                          {repo.lastCommit}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground/50 text-[10px] py-4 uppercase tracking-widest">
                    No repos tracked
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
