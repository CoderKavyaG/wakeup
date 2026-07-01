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
  Activity, Cpu, MemoryStick, GitBranch as GitBranchIcon, FileText, ClipboardCopy, Power,
  Settings, Plus, Trash2, Globe, Music, MessageSquare, Compass, Pin, FolderGit2, Bot, Sparkles
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useTerminalStore } from "@/store/useTerminalStore";

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
  const [ports, setPorts] = useState<{ port: number; active: boolean }[]>([]);
  const [pinnedPorts, setPinnedPorts] = useState<number[]>([]);
  
  // Custom Apps State
  const [customApps, setCustomApps] = useState<{ id: string; name: string; command: string }[]>([
    { id: "1", name: "VS Code", command: "VS Code" },
    { id: "2", name: "Terminal", command: "Terminal" },
    { id: "3", name: "Docker Desktop", command: "Docker Desktop" },
    { id: "4", name: "Brave Browser", command: "Brave" },
    { id: "5", name: "Google Chrome", command: "Chrome" },
    { id: "6", name: "Spotify Desktop", command: "Spotify" }
  ]);
  const [isEditingApps, setIsEditingApps] = useState(false);
  const [isAddingApp, setIsAddingApp] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppCommand, setNewAppCommand] = useState("");

  const [agentPort, setAgentPort] = useState(3131);
  
  // Launch preferences
  const [browserPref, setBrowserPref] = useState<string>("default");
  const [musicPref, setMusicPref] = useState<string>("ytmusic");
  const [aiPref, setAiPref] = useState<string>("chatgpt");

  // Saved Links State
  const [savedLinks, setSavedLinks] = useState<{ id: string; name: string; url: string; platform: string }[]>([]);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkPlatform, setNewLinkPlatform] = useState("other");

  const [filesLoading, setFilesLoading] = useState(false);
  const [portsLoading, setPortsLoading] = useState(false);
  
  const [agentOffline, setAgentOffline] = useState(false);
  const [isElectron, setIsElectron] = useState<boolean | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<"win" | "unix">("win");
  const [runMode, setRunMode] = useState<"standard" | "background">("standard");

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
  const { widgets, addWidget } = useLayoutStore();
  const sendTerminalCommand = useTerminalStore((s) => s.sendCommand);
  const localProjects = projects.filter(p => p.folderPath).slice(0, 3);

  // Load saved configurations on mount
  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!(window as any).electronAPI?.isElectron);
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("win")) {
        setActivePlatformTab("win");
      } else {
        setActivePlatformTab("unix");
      }
    }
    
    let saved = localStorage.getItem("DEVOS_WORKSPACE");
    if (!saved) {
      saved = "C:\\Users\\Kavya\\Projects\\wakeup";
      localStorage.setItem("DEVOS_WORKSPACE", saved);
    }
    setWorkspacePath(saved);
    fetchFiles(saved);
    
    // Auto-register workspace
    fetch("/api/machine/register-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: saved })
    }).then(() => fetchGitRepos());
    
    const savedApps = localStorage.getItem("DEVOS_CUSTOM_APPS");
    if (savedApps) {
      try { setCustomApps(JSON.parse(savedApps)); } catch {}
    } else {
      const defaultApps = [
        { id: "1", name: "VS Code", command: "VS Code" },
        { id: "2", name: "Terminal", command: "Terminal" },
        { id: "3", name: "Docker Desktop", command: "Docker Desktop" },
        { id: "4", name: "Brave Browser", command: "Brave" },
        { id: "5", name: "Google Chrome", command: "Chrome" },
        { id: "6", name: "Spotify Desktop", command: "Spotify" }
      ];
      setCustomApps(defaultApps);
      localStorage.setItem("DEVOS_CUSTOM_APPS", JSON.stringify(defaultApps));
    }

    // Load Pinned Ports
    const savedPinned = localStorage.getItem("DEVOS_PINNED_PORTS");
    if (savedPinned) {
      try { setPinnedPorts(JSON.parse(savedPinned)); } catch {}
    } else {
      const defaultPins = [3000, 3001, 8000];
      setPinnedPorts(defaultPins);
      localStorage.setItem("DEVOS_PINNED_PORTS", JSON.stringify(defaultPins));
    }

    // Load Launch Preferences
    setBrowserPref(localStorage.getItem("DEVOS_BROWSER_PREF") || "default");
    setMusicPref(localStorage.getItem("DEVOS_MUSIC_PREF") || "ytmusic");
    setAiPref(localStorage.getItem("DEVOS_AI_PREF") || "chatgpt");

    // Load Saved Links
    const savedLinksData = localStorage.getItem("DEVOS_SAVED_LINKS") || localStorage.getItem("DEVOS_SAVED_CHATS");
    if (savedLinksData) {
      try { setSavedLinks(JSON.parse(savedLinksData)); } catch {}
    } else {
      const defaultLinks = [
        { id: "1", name: "ChatGPT Thread", url: "https://chatgpt.com", platform: "chatgpt" },
        { id: "2", name: "Claude Workspace", url: "https://claude.ai", platform: "claude" },
        { id: "3", name: "GitHub Dashboard", url: "https://github.com", platform: "github" }
      ];
      setSavedLinks(defaultLinks);
      localStorage.setItem("DEVOS_SAVED_LINKS", JSON.stringify(defaultLinks));
    }

    fetch("/api/machine-port")
      .then(r => r.json())
      .then(data => {
        if (data.port) setAgentPort(data.port);
      })
      .catch(() => {});

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

    // Get fresh pins
    let currentPinned: number[] = [];
    try {
      const savedPinned = localStorage.getItem("DEVOS_PINNED_PORTS");
      if (savedPinned) currentPinned = JSON.parse(savedPinned);
    } catch {}

    try {
      const res = await fetch(`/api/machine/ports`);
      if (res.status === 503) {
        setAgentOffline(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter out Windows system ports to keep it clean for dev
        const filtered = data.filter((p: any) => p.port >= 3000 && p.port < 40000);
        
        // Merge with pinned ports
        const merged = [...filtered];
        currentPinned.forEach(pin => {
          if (!merged.some(m => m.port === pin)) {
            merged.push({ port: pin, active: false });
          }
        });
        setPorts(merged);
      }
    } catch {
      const fallback = currentPinned.map(p => ({ port: p, active: false }));
      setPorts(fallback);
    } finally {
      setPortsLoading(false);
    }
  };

  const handleSaveWorkspace = (pathVal?: string) => {
    const targetPath = pathVal || workspacePath;
    localStorage.setItem("DEVOS_WORKSPACE", targetPath);
    setIsEditingPath(false);
    fetchFiles(targetPath);
    
    // Auto-register so it shows up in Repos list
    fetch("/api/machine/register-workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: targetPath })
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
        setTimeout(fetchPorts, 2000);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      await fetch(`/api/machine/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: command, cwd: workspacePath || undefined })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunchAI = () => {
    let url = "https://chatgpt.com";
    if (aiPref === "claude") url = "https://claude.ai";
    if (aiPref === "gemini") url = "https://gemini.google.com";
    window.open(url, "_blank");
  };

  const handleLaunchMusic = async () => {
    if (musicPref === "spotify_desktop") {
      try {
        await fetch(`/api/machine/launch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app: "Spotify" })
        });
      } catch (e) {
        console.error(e);
      }
      return;
    }

    let url = "https://music.youtube.com";
    if (musicPref === "spotify_web") url = "https://open.spotify.com";
    window.open(url, "_blank");
  };

  const handleLaunchUrl = (targetUrl: string) => {
    window.open(targetUrl, "_blank");
  };

  const handleAddApp = () => {
    if (!newAppName.trim() || !newAppCommand.trim()) return;
    const newApp = {
      id: Date.now().toString(),
      name: newAppName.trim(),
      command: newAppCommand.trim()
    };
    const updated = [...customApps, newApp];
    setCustomApps(updated);
    localStorage.setItem("DEVOS_CUSTOM_APPS", JSON.stringify(updated));
    setNewAppName("");
    setNewAppCommand("");
    setIsAddingApp(false);
  };

  const handleDeleteApp = (id: string) => {
    const updated = customApps.filter(app => app.id !== id);
    setCustomApps(updated);
    localStorage.setItem("DEVOS_CUSTOM_APPS", JSON.stringify(updated));
  };

  const handleAddLink = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !/^[a-z]+:\/\//i.test(url)) {
      url = "https://" + url;
    }
    const newLink = {
      id: Date.now().toString(),
      name: newLinkName.trim(),
      url,
      platform: newLinkPlatform
    };
    const updated = [...savedLinks, newLink];
    setSavedLinks(updated);
    localStorage.setItem("DEVOS_SAVED_LINKS", JSON.stringify(updated));
    localStorage.setItem("DEVOS_SAVED_CHATS", JSON.stringify(updated));
    setNewLinkName("");
    setNewLinkUrl("");
    setNewLinkPlatform("other");
    setIsAddingLink(false);
  };

  const handleDeleteLink = (id: string) => {
    const updated = savedLinks.filter(link => link.id !== id);
    setSavedLinks(updated);
    localStorage.setItem("DEVOS_SAVED_LINKS", JSON.stringify(updated));
    localStorage.setItem("DEVOS_SAVED_CHATS", JSON.stringify(updated));
  };

  const handleTogglePin = (portNum: number) => {
    let updated: number[];
    if (pinnedPorts.includes(portNum)) {
      updated = pinnedPorts.filter(p => p !== portNum);
    } else {
      updated = [...pinnedPorts, portNum];
    }
    setPinnedPorts(updated);
    localStorage.setItem("DEVOS_PINNED_PORTS", JSON.stringify(updated));
    
    setPorts(prev => {
      const isStillInList = updated.includes(portNum) || prev.some(p => p.port === portNum && p.active);
      if (!isStillInList) {
        return prev.filter(p => p.port !== portNum);
      }
      return prev;
    });
  };

  const handleRunNpmScript = async (targetPath: string, scriptName: string) => {
    try {
      const hasTerminal = widgets.some(
        (w) => w.type === "terminal" && w.metadata?.initialCwd === targetPath
      );
      if (!hasTerminal) {
        await addWidget("terminal", { initialCwd: targetPath });
      }
      
      await fetch("/api/machine/run-npm-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath, script: scriptName })
      });
    } catch (e) {
      console.error(e);
    }
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

  if (agentOffline) {
    return (
      <div id="machine-control-widget" className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl overflow-hidden divide-y divide-border/40 border border-red-500/10 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.05)] font-sans">
        <div className="px-4 py-3 shrink-0 flex items-center justify-between bg-[#0f0f11]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">Machine Control</h3>
          </div>
          <button 
            onClick={handleStartAgent} 
            className="text-[9px] uppercase border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)] cursor-pointer"
          >
            <Power className="w-3 h-3 animate-pulse" /> Start Agent
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#0d0d10]">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3 shrink-0">
            <Terminal className="w-4.5 h-4.5" />
          </div>
          <h4 className="text-xs font-semibold tracking-tight text-white mb-1.5 font-mono uppercase">Local Agent Offline</h4>
          <p className="text-[11px] text-white/50 max-w-[280px] leading-relaxed mb-3">
            To link your local processes, folders, ports, and scripts, run this one-liner in your terminal to start the secure loopback agent:
          </p>

          <div className="flex gap-1.5 mb-2">
            <button 
              onClick={() => setActivePlatformTab("win")}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                activePlatformTab === "win" 
                  ? "bg-primary/15 text-primary border-primary/20 font-bold" 
                  : "bg-transparent text-white/40 border-white/5 hover:text-white"
              }`}
            >
              Windows (PowerShell)
            </button>
            <button 
              onClick={() => setActivePlatformTab("unix")}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                activePlatformTab === "unix" 
                  ? "bg-primary/15 text-primary border-primary/20 font-bold" 
                  : "bg-transparent text-white/40 border-white/5 hover:text-white"
              }`}
            >
              macOS / Linux
            </button>
          </div>

          <div className="flex gap-1.5 mb-3">
            <button 
              onClick={() => setRunMode("standard")}
              className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                runMode === "standard" 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold" 
                  : "bg-transparent text-white/30 border-white/5 hover:text-white"
              }`}
            >
              Interactive (runs in terminal)
            </button>
            <button 
              onClick={() => setRunMode("background")}
              className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                runMode === "background" 
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20 font-semibold" 
                  : "bg-transparent text-white/30 border-white/5 hover:text-white"
              }`}
            >
              Persistent (runs in background)
            </button>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-[280px] text-left">
            <div className="flex items-center justify-between px-3 py-2 rounded bg-black/40 border border-white/5 font-mono text-[9px] text-amber-400/90 group relative">
              <span className="truncate">
                {activePlatformTab === "win" 
                  ? (runMode === "standard" 
                      ? "irm https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.ps1 | iex" 
                      : "powershell -WindowStyle Hidden -Command \"irm https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.ps1 | iex\"")
                  : (runMode === "standard" 
                      ? "curl -fsSL https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.sh | bash" 
                      : "nohup bash -c \"curl -fsSL https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.sh | bash\" > /dev/null 2>&1 &")
                }
              </span>
              <button 
                onClick={() => {
                  let cmd = "";
                  if (activePlatformTab === "win") {
                    cmd = runMode === "standard" 
                      ? "irm https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.ps1 | iex" 
                      : "powershell -WindowStyle Hidden -Command \"irm https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.ps1 | iex\"";
                  } else {
                    cmd = runMode === "standard" 
                      ? "curl -fsSL https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.sh | bash" 
                      : "nohup bash -c \"curl -fsSL https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent/install.sh | bash\" > /dev/null 2>&1 &";
                  }
                  navigator.clipboard.writeText(cmd);
                }} 
                className="text-white/30 hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
                title="Copy Command"
              >
                <ClipboardCopy className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[9px] text-white/30 italic text-center font-mono">
              {runMode === "background" 
                ? "Will run in the background and survive terminal exit. (Must restart on system boot)" 
                : "Will shut down if you close the terminal window."}
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg text-left text-[10px] text-amber-400/80 space-y-1.5 max-w-[280px] leading-relaxed">
            <span className="font-bold uppercase tracking-wider font-mono flex items-center gap-1">
              ⚠️ Browser SSL Security Action Required
            </span>
            <p>
              Since DevOS is a secure HTTPS app, browsers block connections to your local machine until you authorize the agent's self-signed certificate:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 font-sans font-medium text-amber-300">
              <li>
                Click here: <a href={`https://local.wakeup.com:${agentPort}/ports`} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200 font-bold">Authorize SSL Certificate</a>
              </li>
              <li>
                Click <strong>"Advanced"</strong> &➔ <strong>"Proceed to local.wakeup.com (unsafe)"</strong>.
              </li>
              <li>
                Return here and click <strong>Retry Connection</strong> below.
              </li>
            </ol>
          </div>

          <Button 
            size="sm" 
            className="mt-4 h-7 text-xs bg-white text-black hover:bg-white/90 px-4 cursor-pointer"
            onClick={fetchPorts}
            disabled={portsLoading}
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${portsLoading ? 'animate-spin' : ''}`} />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div id="machine-control-widget" className="flex flex-col h-full text-foreground bg-[#0f0f11] rounded-xl overflow-hidden divide-y divide-border/40 transition-all duration-1000 shadow-[0_0_15px_rgba(34,197,94,0.08)] border border-green-500/20 font-sans">
      
      {/* ── HEADER ── */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between bg-[#0f0f11]">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-white/90">Machine Control</h3>
        </div>
        <Badge variant="outline" className="text-[9px] uppercase border-green-500/20 text-green-500 bg-green-500/10 flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Agent Connected
        </Badge>
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
            <FileText className="w-3 h-3 text-emerald-400 shrink-0" /> <span className="truncate">{gitInfo.commit}</span>
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
                    id="machine-control-input"
                    value={workspacePath}
                    onChange={e => setWorkspacePath(e.target.value)}
                    placeholder="Enter absolute path (e.g. C:\Users\...)"
                    className="h-7 text-xs bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
                  />
                  <Button size="sm" className="h-7 px-3 text-xs bg-white text-black hover:bg-white/90" onClick={() => handleSaveWorkspace()}>Save</Button>
                </div>
                {!workspacePath && (
                  <span className="text-[10px] text-amber-400/80 italic font-mono">You must enter and save your project's folder path above to enable Git & file tracking.</span>
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
                      <div key={p.id} className="text-xs text-foreground/80 flex items-center justify-between p-1.5 bg-black/20 rounded hover:bg-white/5 cursor-pointer" onClick={() => { setWorkspacePath(p.folderPath!); handleSaveWorkspace(p.folderPath!); }}>
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
                        className={`h-6 text-[10px] px-2 border-white/10 ${script === 'dev' || script === 'start' ? 'bg-primary text-primary-foreground font-bold hover:bg-primary/90 animate-pulse' : 'bg-black/20 hover:bg-white/10 text-foreground'}`}
                        onClick={() => handleRunNpmScript(workspacePath, script)}
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
        <div className={`flex flex-col bg-[#0f0f11] overflow-hidden ${isNarrow ? "shrink-0" : "flex-1 min-h-0"}`}>
          
          {/* SECTION 2: PORTS & PROCESSES */}
          <div className={`flex flex-col ${isNarrow ? "shrink-0" : "flex-1 min-h-0 overflow-hidden"}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="p-3 shrink-0 border-b border-white/10 bg-[#0f0f11] flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 font-sans">
                <Activity className="w-3.5 h-3.5 text-primary" /> Ports Monitoring
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={fetchPorts} disabled={portsLoading || agentOffline}>
                <RefreshCw className={`w-3 h-3 text-muted-foreground ${portsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1.5">
              {ports.length > 0 ? (
                ports.map(({ port, active }) => {
                  const isHttp = [3000, 3001, 8080, 4000, 5000].includes(port);
                  const isPinned = pinnedPorts.includes(port);
                  return (
                    <div 
                      key={port} 
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        active 
                          ? "border-green-500/20 bg-green-500/[0.02] hover:border-green-500/40" 
                          : "border-white/5 bg-white/[0.01] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-2 h-2 shrink-0 rounded-full ${active ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
                        <span className="text-xs font-bold font-mono w-10 shrink-0 text-foreground">{port}</span>
                        {!isCollapsed && (
                          <Badge variant="outline" className="text-[9px] uppercase border-white/10 text-muted-foreground font-mono px-1.5 py-0 h-4 truncate">
                            {KNOWN_PORTS[port] || "Service"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`w-6 h-6 shrink-0 rounded-md transition-colors ${
                            isPinned ? "text-primary hover:bg-primary/20" : "text-muted-foreground hover:bg-white/10 hover:text-white"
                          }`}
                          onClick={() => handleTogglePin(port)}
                          title={isPinned ? "Unpin port" : "Pin port"}
                        >
                          <Pin className={`w-3 h-3 ${isPinned ? "fill-current" : ""}`} />
                        </Button>
                        {isHttp && active && !isCollapsed && (
                          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 hover:bg-primary/20 hover:text-primary rounded-md" onClick={() => window.open(`http://localhost:${port}`, '_blank')}>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        {active && (
                          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 hover:bg-red-500/20 hover:text-red-500 rounded-md" onClick={() => handleKillPort(port)} title="Kill Process">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground/50 text-[10px] py-4 uppercase tracking-widest font-mono">
                  No active ports detected
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM GROUP: Preferences + Saved Chats + Tracked Projects */}
          {!isShort && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">

              {/* Preferences */}
              <div className="shrink-0 p-3 bg-white/[0.01] border-b border-white/[0.04]">
                <div className="text-[10px] font-bold uppercase text-white/40 tracking-wider mb-2 flex items-center justify-between font-sans">
                  <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-primary" /> Preferences</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider">Browser</span>
                    <select
                      value={browserPref}
                      onChange={(e) => {
                        setBrowserPref(e.target.value);
                        localStorage.setItem("DEVOS_BROWSER_PREF", e.target.value);
                      }}
                      className="bg-[#131316] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-primary/50 cursor-pointer h-7 transition-colors hover:border-white/20"
                    >
                      <option value="default" className="bg-[#131316] text-white">Default Browser</option>
                      <option value="chrome" className="bg-[#131316] text-white">Google Chrome</option>
                      <option value="brave" className="bg-[#131316] text-white">Brave Browser</option>
                      <option value="edge" className="bg-[#131316] text-white">Microsoft Edge</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider">Music Player</span>
                    <select
                      value={musicPref}
                      onChange={(e) => {
                        setMusicPref(e.target.value);
                        localStorage.setItem("DEVOS_MUSIC_PREF", e.target.value);
                      }}
                      className="bg-[#131316] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-primary/50 cursor-pointer h-7 transition-colors hover:border-white/20"
                    >
                      <option value="ytmusic" className="bg-[#131316] text-white">YouTube Music</option>
                      <option value="spotify_app" className="bg-[#131316] text-white">Spotify App</option>
                      <option value="spotify_web" className="bg-[#131316] text-white">Spotify Web</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] bg-[#1db954]/10 text-[#1db954] hover:bg-[#1db954]/20 border-[#1db954]/20 justify-start hover:scale-102 transition-all font-semibold"
                    onClick={handleLaunchMusic}
                  >
                    <Music className="w-3 h-3 mr-1.5" /> Music Player
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 justify-start hover:scale-102 transition-all font-semibold"
                    onClick={handleLaunchAI}
                  >
                    <MessageSquare className="w-3 h-3 mr-1.5" /> AI Chat
                  </Button>
                </div>
              </div>

              {/* Custom Apps */}
              <div className="shrink-0 p-3 bg-white/[0.01] border-b border-white/[0.04]">
                <div className="text-[10px] font-bold uppercase text-white/40 tracking-wider mb-2 flex items-center justify-between font-sans">
                  <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-primary" /> Custom Apps</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 text-[9px] px-1.5 text-white/40 hover:text-white hover:bg-white/5 font-semibold"
                      onClick={() => {
                        setIsAddingApp(!isAddingApp);
                        setIsAddingLink(false);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-0.5" /> App
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 text-[9px] px-1.5 text-white/40 hover:text-white hover:bg-white/5 font-semibold"
                      onClick={() => setIsEditingApps(!isEditingApps)}
                    >
                      {isEditingApps ? "Done" : "Edit"}
                    </Button>
                  </div>
                </div>

                {isAddingApp && (
                  <div className="p-2.5 rounded-lg border border-white/10 bg-black/40 space-y-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="App Name (e.g. Spotify)"
                        className="h-7 text-[10px] bg-black/40 border-white/10 text-white placeholder:text-white/30"
                      />
                      <Input
                        value={newAppCommand}
                        onChange={(e) => setNewAppCommand(e.target.value)}
                        placeholder="Cmd (e.g. spotify)"
                        className="h-7 text-[10px] bg-black/40 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-6 flex-1 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                        onClick={handleAddApp}
                      >
                        Save App
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 flex-1 text-[10px] text-white/60 hover:text-white hover:bg-white/5 font-semibold"
                        onClick={() => {
                          setIsAddingApp(false);
                          setNewAppName("");
                          setNewAppCommand("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {isEditingApps && !isAddingApp ? (
                  <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-hide pr-1">
                    {customApps.length > 0 ? (
                      customApps.map((app) => (
                        <div key={app.id} className="flex gap-1.5 items-center justify-between p-1.5 rounded bg-black/40 border border-white/5">
                          <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{app.name}</span>
                          <span className="text-[9px] text-muted-foreground truncate flex-1 ml-1" title={app.command}>{app.command}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:bg-red-400/20 rounded"
                            onClick={() => handleDeleteApp(app.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground/40 text-[9px] py-2">No custom apps added yet.</div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto scrollbar-hide">
                    {customApps.length > 0 ? (
                      customApps.map((app) => (
                        <Button
                          key={app.id}
                          variant="outline"
                          size="sm"
                          className="h-8 text-[10px] bg-white/5 text-white hover:bg-white/10 border-white/10 justify-start hover:scale-102 transition-all truncate pr-1"
                          onClick={() => handleLaunch(app.command)}
                          disabled={agentOffline}
                          title={app.command}
                        >
                          <Play className="w-3 h-3 text-blue-400 mr-1.5 shrink-0" />
                          <span className="truncate">{app.name}</span>
                        </Button>
                      ))
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground/40 text-[9px] py-2 font-mono">
                        No custom apps. Click + App to add.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Saved Links */}
              <div className="shrink-0 p-3 bg-white/[0.01] border-b border-white/[0.04]">
                <div className="text-[10px] font-bold uppercase text-white/40 tracking-wider mb-2 flex items-center justify-between font-sans">
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-primary" /> Saved Links</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 text-[9px] px-1.5 text-white/40 hover:text-white hover:bg-white/5 font-semibold"
                      onClick={() => {
                        setIsAddingLink(!isAddingLink);
                        setIsAddingApp(false);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-0.5" /> Link
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 text-[9px] px-1.5 text-white/40 hover:text-white hover:bg-white/5 font-semibold"
                      onClick={() => setIsEditingLinks(!isEditingLinks)}
                    >
                      {isEditingLinks ? "Done" : "Edit"}
                    </Button>
                  </div>
                </div>

                {isAddingLink && (
                  <div className="p-2.5 rounded-lg border border-white/10 bg-black/40 space-y-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        placeholder="Label (e.g. Claude)"
                        className="h-7 text-[10px] bg-black/40 border-white/10 text-white placeholder:text-white/30"
                      />
                      <select
                        value={newLinkPlatform}
                        onChange={(e) => setNewLinkPlatform(e.target.value)}
                        className="bg-[#131316] border border-white/10 rounded px-1.5 text-[10px] text-white focus:outline-none focus:border-primary/50 h-7 transition-colors hover:border-white/20"
                      >
                        <option value="chatgpt" className="bg-[#131316] text-white">ChatGPT</option>
                        <option value="claude" className="bg-[#131316] text-white">Claude</option>
                        <option value="github" className="bg-[#131316] text-white">GitHub</option>
                        <option value="other" className="bg-[#131316] text-white">Other Link</option>
                      </select>
                    </div>
                    <Input
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="URL (e.g. claude.ai/chats)"
                      className="h-7 text-[10px] bg-black/40 border-white/10 text-white placeholder:text-white/30 w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-6 flex-1 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                        onClick={handleAddLink}
                      >
                        Save Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 flex-1 text-[10px] text-white/60 hover:text-white hover:bg-white/5 font-semibold"
                        onClick={() => {
                          setIsAddingLink(false);
                          setNewLinkName("");
                          setNewLinkUrl("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {isEditingLinks && !isAddingLink ? (
                  <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-hide pr-1">
                    {savedLinks.length > 0 ? (
                      savedLinks.map((link) => (
                        <div key={link.id} className="flex gap-1.5 items-center justify-between p-1.5 rounded bg-black/40 border border-white/5">
                          <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{link.name}</span>
                          <span className="text-[9px] text-muted-foreground truncate flex-1 ml-1" title={link.url}>{link.url}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:bg-red-400/20 rounded"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground/40 text-[9px] py-2">No custom links added yet.</div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto scrollbar-hide">
                    {savedLinks.length > 0 ? (
                      savedLinks.map((link) => {
                        const getIcon = () => {
                          if (link.platform === 'github') return <FolderGit2 className="w-3 h-3 text-purple-400 mr-1.5 shrink-0" />;
                          if (link.platform === 'claude') return <Sparkles className="w-3 h-3 text-orange-400 mr-1.5 shrink-0" />;
                          if (link.platform === 'chatgpt') return <Bot className="w-3 h-3 text-emerald-400 mr-1.5 shrink-0" />;
                          return <Globe className="w-3 h-3 text-blue-400 mr-1.5 shrink-0" />;
                        };
                        return (
                          <Button
                            key={link.id}
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] bg-white/5 text-white hover:bg-white/10 border-white/10 justify-start hover:scale-102 transition-all truncate pr-1"
                            onClick={() => handleLaunchUrl(link.url)}
                            title={link.url}
                          >
                            {getIcon()}
                            <span className="truncate">{link.name}</span>
                          </Button>
                        );
                      })
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground/40 text-[9px] py-2 font-mono">
                        No custom links. Click + Link to add.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tracked Projects */}
              <div className="flex-1 p-3 bg-white/[0.01] flex flex-col min-h-[180px]">
                <div className="text-[10px] font-bold uppercase text-white/40 tracking-wider mb-2 flex items-center justify-between shrink-0 font-sans">
                  <span className="flex items-center gap-1.5"><FolderCode className="w-3.5 h-3.5 text-primary" /> Tracked Projects</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-white/40 hover:text-white hover:bg-white/5" onClick={fetchGitRepos} disabled={gitReposLoading || agentOffline}>
                    <RefreshCw className={`w-3 h-3 ${gitReposLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-1">
                  {gitRepos.length > 0 ? (
                    gitRepos.map((repo, i) => {
                      const isActive = workspacePath === repo.path;
                      const hasScripts = repo.npmScripts && Object.keys(repo.npmScripts).length > 0;
                      return (
                        <div 
                          key={i} 
                          className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-all ${
                            isActive 
                              ? "border-primary/40 bg-primary/[0.02] shadow-[0_0_10px_rgba(var(--primary),0.02)]" 
                              : "border-white/[0.06] bg-white/[0.01] hover:border-white/15"
                          }`}
                        >
                          {/* Repo Title Header */}
                          <div className="flex items-center justify-between overflow-hidden cursor-pointer" onClick={() => { setWorkspacePath(repo.path); handleSaveWorkspace(repo.path); }}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Folder className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary animate-pulse" : "text-blue-400"}`} />
                              <span className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-foreground/80"}`}>{repo.name}</span>
                              {repo.branch && (
                                <Badge variant="outline" className={`text-[8px] uppercase font-mono px-1.5 py-0 h-4 shrink-0 ${isActive ? "border-primary/20 text-primary bg-primary/10" : "border-white/10 text-muted-foreground"}`}>
                                  {repo.branch}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {repo.uncommitted > 0 && (
                                <div className="flex items-center gap-1 text-[9px] text-amber-400 font-mono font-bold" title={`${repo.uncommitted} uncommitted`}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {repo.uncommitted}
                                </div>
                              )}
                              {repo.ahead > 0 && (
                                <div className="flex items-center gap-1 text-[9px] text-blue-400 font-mono font-bold" title={`${repo.ahead} ahead`}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {repo.ahead}
                                </div>
                              )}
                            </div>
                          </div>

                          {repo.lastCommit && (
                            <div className="text-[9px] font-mono text-muted-foreground truncate opacity-70 px-0.5">
                              {repo.lastCommit}
                            </div>
                          )}

                          {/* Quick Workspace Commands row */}
                          <div className="flex items-center justify-between border-t border-white/[0.04] pt-1.5 mt-0.5">
                            {/* Launch actions */}
                            <div className="flex gap-1.5">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5.5 text-[9px] px-2 bg-white/5 hover:bg-primary/25 hover:text-primary border border-white/5 text-white/80 hover:scale-105 transition-all font-semibold"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await fetch(`/api/machine/open`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ path: repo.path, app: "vscode" })
                                    });
                                  } catch {}
                                }}
                                title="Open project in VS Code"
                              >
                                <Code2 className="w-3 h-3 mr-1 text-primary" /> VS Code
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5.5 text-[9px] px-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:scale-105 transition-all font-semibold"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await fetch(`/api/machine/open`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ path: repo.path })
                                    });
                                  } catch {}
                                }}
                                title="Open in File Explorer"
                              >
                                <Folder className="w-3 h-3 mr-1 text-blue-400" /> Explore
                              </Button>
                            </div>

                            {/* Scanned package.json Scripts list */}
                            {hasScripts && (
                              <div className="flex gap-1 overflow-x-auto max-w-[170px] scrollbar-none">
                                {Object.keys(repo.npmScripts).filter(s => ['dev', 'start', 'build'].includes(s)).map((script) => (
                                  <Button
                                    key={script}
                                    variant="outline"
                                    size="sm"
                                    className={`h-5 text-[8px] uppercase px-1 text-white bg-black/40 border border-white/10 hover:bg-green-500/25 hover:text-green-400 hover:border-green-500/40 font-mono hover:scale-105 transition-all cursor-pointer`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRunNpmScript(repo.path, script);
                                    }}
                                    title={`Run 'npm run ${script}'`}
                                  >
                                    <Play className="w-2 h-2 mr-0.5 text-green-400 fill-current" /> {script}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground/50 text-[10px] py-4 uppercase tracking-widest font-mono">
                      No tracked projects detected
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
