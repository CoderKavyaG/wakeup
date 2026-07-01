"use client";

import React, { useState, useEffect } from "react";
import { getAgentUrl } from "@/lib/agentClient";
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

const renderAppIcon = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes("vs code") || norm.includes("vscode")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.91 6.32a.48.48 0 0 0-.17-.37L19.46.22a.48.48 0 0 0-.77.38v4.29l-4.57 3.8-3.08-2.56a.48.48 0 0 0-.74.1L.12 17.5a.48.48 0 0 0 .27.77l10.4-2.6 3.48 2.9a.48.48 0 0 0 .77-.37v-4.29l4.57-3.8 3.08 2.56a.48.48 0 0 0 .74-.1L23.9 6.5a.48.48 0 0 0 .01-.18z" fill="#007acc"/>
      </svg>
    );
  }
  if (norm.includes("terminal") || norm.includes("console") || norm.includes("powershell") || norm.includes("cmd") || norm.includes("git bash")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" stroke="#38bdf8" />
        <line x1="12" y1="19" x2="20" y2="19" stroke="#38bdf8" />
      </svg>
    );
  }
  if (norm.includes("docker")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.983 8.871h-1.996V10.87h1.996V8.871zM13.983 6.371h-1.996v2.001h1.996V6.371zM11.488 8.871H9.493V10.87h1.995V8.871zM11.488 6.371H9.493v2.001h1.995V6.371zM8.995 8.871H7v1.999h1.995V8.871zM8.995 6.371H7v2.001h1.995V6.371zM11.488 3.876H9.493V5.87h1.995V3.876zM6.505 8.871H4.51v1.999h1.995V8.871zM16.478 8.871h-1.995V10.87h1.995V8.871zM23.993 11.23c-.122-.041-.83-.243-1.637-.243-.655 0-1.838.252-2.464.747a.267.267 0 0 0-.083.189v4.291c-.006.182-.016.364-.029.544-.127 1.545-1.127 2.378-2.617 2.378-1.503 0-2.883-.932-3.64-2.222l-.027-.052-.027.052c-.757 1.29-2.137 2.222-3.64 2.222-1.489 0-2.489-.833-2.617-2.378-.013-.18-.023-.362-.029-.544v-5.698c0-.129-.089-.241-.215-.27l-5.64-1.282A.263.263 0 0 0 0 11.839v1.204c0 4.673 3.655 8.461 8.163 8.461 4.509 0 8.164-3.788 8.164-8.461V12.7c.489-.481 1.258-.752 1.837-.752.483 0 .903.111 1.206.271a.267.267 0 0 0 .399-.234v-1c0-.128-.09-.239-.215-.269" fill="#0db7ed"/>
      </svg>
    );
  }
  if (norm.includes("brave")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L1.5 4.5v7c0 5.5 4.5 10.5 10.5 12.5 6-2 10.5-7 10.5-12.5v-7L12 0zm0 4.7c1.3 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5zm0 6.8c2.8 0 5 2.2 5 5H7c0-2.8 2.2-5 5-5z" fill="#ff5000"/>
      </svg>
    );
  }
  if (norm.includes("chrome") || norm.includes("google chrome")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#4285F4"/>
        <path d="M12 2a10 10 0 0 0-8.66 5l4.33 7.5A5 5 0 0 1 12 7h8.66A10 10 0 0 0 12 2z" fill="#EA4335"/>
        <path d="M22 12a10 10 0 0 1-5 8.66l-4.33-7.5A5 5 0 0 0 17 12h5z" fill="#FBBC05"/>
        <path d="M12 22a10 10 0 0 1-5-8.66l4.33 7.5A5 5 0 0 0 12 17v5z" fill="#34A853"/>
        <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
        <circle cx="12" cy="12" r="3.5" fill="#4285F4"/>
      </svg>
    );
  }
  if (norm.includes("discord")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" fill="#5865F2"/>
      </svg>
    );
  }
  if (norm.includes("spotify")) {
    return (
      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.669.47-.745 3.848-.879 7.14-.51 9.82 1.13.296.18.387.563.207.86zm1.224-2.722c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.182-.413.125-.847-.107-.972-.52-.125-.413.108-.847.52-.972 3.666-1.112 8.232-.572 11.342 1.342.366.226.486.707.26 1.074zm.106-2.833C14.382 8.788 8.568 8.6 5.16 9.633c-.523.158-1.076-.14-1.235-.662-.158-.523.14-1.078.662-1.235 3.91-1.187 10.339-.974 14.407 1.442.47.28.623.89.343 1.36-.28.47-.89.62-1.36.34z" fill="#1DB954"/>
      </svg>
    );
  }
  return <Play className="w-3 h-3 text-blue-400 mr-1.5 shrink-0" />;
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
    { id: "6", name: "Discord", command: "Discord" }
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

  const initAgentConnection = async () => {
    const isLocal = typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    let startingPort = 3131;
    if (isLocal) {
      try {
        const r = await fetch("/api/machine-port");
        const data = await r.json();
        if (data.port) {
          startingPort = data.port;
        }
      } catch (e) {}
    }

    // Scan startingPort and surrounding ports (3131 to 3135) to find active agent
    const candidatePorts = [startingPort];
    for (let p = 3131; p <= 3135; p++) {
      if (!candidatePorts.includes(p)) candidatePorts.push(p);
    }

    for (const port of candidatePorts) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 600);
        const res = await fetch(`https://local.wakeup.com:${port}/stats`, {
          signal: controller.signal,
          mode: "cors"
        });
        clearTimeout(id);
        if (res.ok) {
          setAgentPort(port);
          localStorage.setItem("DEVOS_AGENT_PORT", port.toString());
          setAgentOffline(false);
          console.log("[MachineControl] Detected agent running on port:", port);
          return port;
        }
      } catch (e) {
        // check next port
      }
    }
    
    // Default fallback
    setAgentPort(startingPort);
    localStorage.setItem("DEVOS_AGENT_PORT", startingPort.toString());
    return null;
  };

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
    fetch(getAgentUrl("/register-workspace"), {
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
        { id: "6", name: "Discord", command: "Discord" }
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

    initAgentConnection().then(() => fetchPorts());
    
    // Auto refresh ports every 10 seconds
    const portInterval = setInterval(fetchPorts, 10000);
    
    // Poll stats every 5 seconds
    const fetchStats = async () => {
      try {
        const res = await fetch(getAgentUrl("/stats"));
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
      const res = await fetch(getAgentUrl("/git-status-all"));
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
        const res = await fetch(getAgentUrl(`/git?path=${encodeURIComponent(workspacePath)}`));
        if (res.ok) setGitInfo(await res.json());
      } catch {}
    };
    fetchGit();

    const fetchNpmScripts = async () => {
      try {
        const res = await fetch(getAgentUrl(`/npm-scripts?path=${encodeURIComponent(workspacePath)}`));
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
      const res = await fetch(getAgentUrl(`/files?path=${encodeURIComponent(path)}`));
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
      const res = await fetch(getAgentUrl(`/ports`));
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
    fetch(getAgentUrl("/register-workspace"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: targetPath })
    }).then(() => fetchGitRepos());
  };

  const handleOpenVSCode = async () => {
    if (!workspacePath) return;
    try {
      await fetch(getAgentUrl(`/open`), {
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
        await fetch(getAgentUrl("/restart"), { method: "POST" });
        setAgentOffline(true);
        setTimeout(fetchPorts, 2000);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      await fetch(getAgentUrl(`/launch`), {
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
        await fetch(getAgentUrl(`/launch`), {
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
      
      await fetch(getAgentUrl("/run-npm-script"), {
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
      await fetch(getAgentUrl("/kill-port"), { 
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
            onClick={() => initAgentConnection().then(() => fetchPorts())}
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
                    <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 10v4" />
                      <path d="M6 6v12" />
                      <path d="M9 10v4" />
                      <path d="M12 4v16" />
                      <path d="M15 8v8" />
                      <path d="M18 11v2" />
                      <path d="M21 9v6" />
                    </svg>
                    Music Player
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 justify-start hover:scale-102 transition-all font-semibold"
                    onClick={handleLaunchAI}
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5 shrink-0 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v1m0 16v1M4 12H3m18 0h-1m-3-7l-1 1m-11 11l-1 1m0-13l1 1m11 11l1 1" />
                      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
                    </svg>
                    AI Chat
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
                          {renderAppIcon(app.name)}
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
                          const normName = link.name.toLowerCase();
                          const normPlat = link.platform.toLowerCase();
                          if (normPlat === 'github' || normName.includes('github')) {
                            return (
                              <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="#ffffff" opacity="0.8"/>
                              </svg>
                            );
                          }
                          if (normPlat === 'claude' || normName.includes('claude')) {
                            return (
                              <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.012 3.655l2.001 4.545 4.966.275-3.834 3.195 1.353 4.792-4.486-2.585-4.486 2.585 1.353-4.792-3.834-3.195 4.966-.275 2.001-4.545zm5.748-1.589l1.492.614-1.636 3.974-1.492-.614 1.636-3.974zm-11.488 0l1.636 3.974-1.492.614-1.636-3.974 1.492-.614z" fill="#D97706"/>
                              </svg>
                            );
                          }
                          if (normPlat === 'chatgpt' || normName.includes('chatgpt') || normName.includes('openai')) {
                            return (
                              <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21.74 11.57c.28-.79.41-1.63.4-2.47a5.5 5.5 0 0 0-3.32-5.06c-.75-.32-1.57-.45-2.39-.4a5.5 5.5 0 0 0-4.88 3.32c-.17.47-.27.95-.3 1.44a5.5 5.5 0 0 0-3.13 1.1c-.63.48-1.13 1.12-1.44 1.86a5.5 5.5 0 0 0-.4 2.39c.04.83.25 1.63.63 2.37a5.5 5.5 0 0 0 3.32 3.13c.48.2 1 .31 1.51.32a5.5 5.5 0 0 0 4.88-3.32 5.5 5.5 0 0 0 3.13-1.1 5.5 5.5 0 0 0 1.5-1.98zm-11-7.73a4.13 4.13 0 0 1 1.79 1.15c.67.7 1.15 1.56 1.4 2.5a5.5 5.5 0 0 0-1.84.3A4.14 4.14 0 0 1 9.4 4.87a4.13 4.13 0 0 1 1.34-1.03zm-4.3 3.86a4.13 4.13 0 0 1 2.97-.67 4.14 4.14 0 0 1 2.35 1.64c-.45.83-.69 1.76-.71 2.7a5.5 5.5 0 0 0-1.86-1.44a4.14 4.14 0 0 1-2.75-2.23zm-.67 6.47a4.13 4.13 0 0 1-1.15-1.79c-.1-.4-.14-.81-.12-1.22a4.14 4.14 0 0 1 3.5 1.16 5.5 5.5 0 0 0 .3 2.33a4.14 4.14 0 0 1-2.53-.48zm4.3 3.86a4.13 4.13 0 0 1-1.34-1.03 4.14 4.14 0 0 1-.46-3.03a5.5 5.5 0 0 0 1.84-.3c.25.94.73 1.8 1.4 2.5a4.13 4.13 0 0 1-1.44 1.86zm6.47.67a4.13 4.13 0 0 1-3.03-.46c.45-.83.69-1.76.71-2.7a5.5 5.5 0 0 0 1.86 1.44c.48.63.79 1.39.88 2.2a4.13 4.13 0 0 1-.42.52zm3.86-4.3a4.13 4.13 0 0 1-.52.42c-.4-.1-.81-.14-1.22-.12a4.14 4.14 0 0 1-.3-2.33a5.5 5.5 0 0 0 1.86 1.44c.1.2.16.4.18.59zm-7-2c-.53 0-.96-.43-.96-.96s.43-.96.96-.96.96.43.96.96-.43.96-.96.96z" fill="#10a37f"/>
                              </svg>
                            );
                          }
                          return <Globe className="w-3.5 h-3.5 text-blue-400 mr-1.5 shrink-0" />;
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
