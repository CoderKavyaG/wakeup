"use client";

import React, { useState, useEffect } from "react";
import { Server, Activity, ArrowUpRight, Cpu, Folder, RefreshCw } from "lucide-react";
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
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">System Monitor</h2>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchSystemStatus(); }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {/* Workspace */}
        {data.workspace && (
          <div className="p-2 border border-border bg-card rounded space-y-1.5">
            <div className="flex items-center justify-between text-[9px]">
              <span className="uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Folder className="w-3 h-3 text-primary" />
                Workspace
              </span>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[8px] px-1">
                {data.workspace.name}
              </Badge>
            </div>
            <div className="text-[8px] text-foreground font-mono truncate py-0.5 border border-border bg-popover px-1.5 rounded">
              {data.workspace.path}
            </div>
            <div className="text-[8px] text-muted-foreground flex flex-wrap gap-1 pt-0.5">
              {data.workspace.contents.map((file, i) => (
                <span key={i} className="bg-card px-2 py-0.5 rounded border border-border/60 font-sans font-medium">
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Localhost Port Servers */}
        <div className="space-y-1">
          <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider px-1 block">Ports</span>
          {data.activePorts.length === 0 ? (
            <div className="p-2 border border-dashed border-border bg-popover rounded text-center text-[8px] text-muted-foreground">
              No dev servers detected
            </div>
          ) : (
            <div className="space-y-1">
              {data.activePorts.map((ap) => (
                <div key={ap.port} className="p-1.5 border border-border bg-popover rounded flex items-center justify-between text-[8px]">
                  <div className="flex-1 pr-1.5">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">:{ap.port}</span>
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                    </div>
                    <p className="text-muted-foreground truncate">{ap.technology}</p>
                  </div>
                  <a href={ap.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-primary/20 text-primary shrink-0">
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Docker containers */}
        <div className="space-y-1">
          <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider px-1 block">Docker</span>
          {data.dockerContainers.length === 0 ? (
            <div className="p-2 border border-border bg-popover rounded text-center text-[8px] text-muted-foreground">
              No containers
            </div>
          ) : (
            <div className="space-y-1">
              {data.dockerContainers.map((container, i) => (
                <div key={i} className="p-1.5 border border-border bg-popover rounded flex items-center justify-between text-[8px]">
                  <div className="min-w-0 pr-1.5">
                    <span className="font-semibold text-foreground block truncate">{container.name}</span>
                    <span className="text-muted-foreground truncate font-mono">{container.image}</span>
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-[7px] shrink-0">
                    {container.status.split(" ")[0]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer System Resources */}
      <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-2 shrink-0 text-[7px] text-muted-foreground uppercase font-semibold">
        <div className="flex items-center gap-1">
          <Cpu className="w-2.5 h-2.5 text-primary" />
          <span>CPU: 8%</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-2.5 h-2.5 text-primary" />
          <span>RAM: 5.2GB / 16GB</span>
        </div>
      </div>
    </div>
  );
}
