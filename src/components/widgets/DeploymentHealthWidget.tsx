"use client";

import React, { useState, useEffect } from "react";
import { Server, Activity, ArrowUpRight, Cpu, Folder, Terminal, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LocalPort {
  port: number;
  technology: string;
  url: string;
}

interface DockerContainer {
  name: string;
  image: string;
  status: string;
}

interface SystemData {
  workspace: {
    path: string;
    name: string;
    contents: string[];
  } | null;
  activePorts: LocalPort[];
  dockerContainers: DockerContainer[];
}

export function DeploymentHealthWidget() {
  const [data, setData] = useState<SystemData>({
    workspace: null,
    activePorts: [],
    dockerContainers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch("/api/system/scan");
      if (!res.ok) throw new Error("Local system scan failed");
      const scanResult = await res.json();
      setData(scanResult);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    // Poll local machine environment every 6 seconds
    const interval = setInterval(fetchSystemStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Local System & Bridge</h2>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchSystemStatus(); }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title="Scan Local System"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1 -mr-2">
        {/* Workspace */}
        {data.workspace && (
          <div className="p-3 border border-border/80 bg-popover/40 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 select-none">
                <Folder className="w-3.5 h-3.5 text-primary" />
                Active Workspace
              </span>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0">
                {data.workspace.name}
              </Badge>
            </div>
            <div className="text-xs text-foreground font-mono truncate leading-none py-1 border border-border/40 bg-muted/20 px-2 rounded">
              {data.workspace.path}
            </div>
            <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1.5 pt-1">
              {data.workspace.contents.map((file, i) => (
                <span key={i} className="bg-card px-2 py-0.5 rounded border border-border/60 font-sans font-medium">
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Localhost Port Servers */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider px-1 block select-none">
            Active Ports & Dev Servers
          </span>
          {data.activePorts.length === 0 ? (
            <div className="p-4 border border-dashed border-border/80 bg-card/30 rounded-lg text-center text-xs text-muted-foreground">
              No active dev servers detected on ports 3000-8080.
            </div>
          ) : (
            <div className="grid gap-2">
              {data.activePorts.map((ap) => (
                <div
                  key={ap.port}
                  className="p-2.5 border border-border bg-popover/40 rounded-lg flex items-center justify-between hover:border-primary/25 transition-all duration-200"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-foreground">localhost:{ap.port}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50 animate-pulse shrink-0" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate font-sans mt-0.5">{ap.technology}</p>
                  </div>
                  <a
                    href={ap.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-all shrink-0"
                    title={`Open localhost:${ap.port}`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Docker containers */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider px-1 block select-none">
            Docker Containers
          </span>
          {data.dockerContainers.length === 0 ? (
            <div className="p-3.5 border border-border/80 bg-card/25 rounded-lg text-center text-xs text-muted-foreground font-sans">
              No running Docker containers detected.
            </div>
          ) : (
            <div className="grid gap-2">
              {data.dockerContainers.map((container, i) => (
                <div
                  key={i}
                  className="p-2 border border-border bg-card/65 rounded-lg flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-xs font-bold text-foreground block truncate">{container.name}</span>
                    <span className="text-[9px] text-muted-foreground truncate font-mono block mt-0.5">{container.image}</span>
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] shrink-0 font-medium">
                    {container.status.split(" ")[0]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer System Resources (aesthetic placeholder) */}
      <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-4 shrink-0 text-[10px] text-muted-foreground font-semibold uppercase">
        <div className="flex items-center space-x-1.5">
          <Cpu className="w-3.5 h-3.5 text-primary/75" />
          <span>CPU: 8%</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-primary/75" />
          <span>RAM: 5.2 / 16 GB</span>
        </div>
      </div>
    </div>
  );
}
