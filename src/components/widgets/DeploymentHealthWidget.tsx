"use client";

import React, { useState, useEffect } from "react";
import { Server, Activity, ArrowUpRight, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Deployment {
  id: string;
  name: string;
  url: string;
  status: "online" | "offline" | "building";
  uptime: string;
  latency: number;
}

export function DeploymentHealthWidget() {
  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: "dep-1",
      name: "DevOS Dashboard",
      url: "localhost:3000",
      status: "online",
      uptime: "99.98%",
      latency: 18,
    },
    {
      id: "dep-2",
      name: "Stranger Chat Backend",
      url: "webrtc-chat.fly.dev",
      status: "online",
      uptime: "99.95%",
      latency: 42,
    },
    {
      id: "dep-3",
      name: "RSS Editorial Feed API",
      url: "news-scraper.render.com",
      status: "building",
      uptime: "99.20%",
      latency: 0,
    },
  ]);

  // Simulate updating latency
  useEffect(() => {
    const interval = setInterval(() => {
      setDeployments(prev =>
        prev.map(d => {
          if (d.status === "online") {
            const jitter = Math.floor(Math.random() * 9) - 4;
            return {
              ...d,
              latency: Math.max(10, d.latency + jitter),
            };
          }
          return d;
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getStatusDotColor = (status: Deployment["status"]) => {
    switch (status) {
      case "online": return "bg-green-500 shadow-green-500/50 animate-pulse";
      case "building": return "bg-yellow-500 shadow-yellow-500/50 animate-pulse";
      default: return "bg-red-500 shadow-red-500/50";
    }
  };

  const getStatusTextColor = (status: Deployment["status"]) => {
    switch (status) {
      case "online": return "text-green-400";
      case "building": return "text-yellow-400";
      default: return "text-red-400";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">System & Deployment Health</h2>
        </div>
      </div>

      {/* Deployment Rows */}
      <div className="flex-1 space-y-3 overflow-auto">
        {deployments.map((dep) => (
          <div
            key={dep.id}
            className="p-3 border border-border/80 bg-popover/40 rounded-lg flex items-center justify-between hover:border-primary/20 transition-all duration-200"
          >
            <div className="min-w-0 flex-1 pr-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-foreground truncate">{dep.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${getStatusDotColor(dep.status)}`} />
              </div>
              <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{dep.url}</p>
            </div>

            <div className="flex items-center space-x-4 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">Uptime</div>
                <span className="text-xs font-bold text-foreground leading-none inline-block mt-1">{dep.uptime}</span>
              </div>

              {dep.status === "online" ? (
                <div className="text-right w-14">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">Ping</div>
                  <span className="text-xs font-mono font-bold text-green-400 leading-none inline-block mt-1">{dep.latency}ms</span>
                </div>
              ) : (
                <div className="text-right w-14">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">Status</div>
                  <span className={`text-[10px] font-bold uppercase leading-none inline-block mt-1 ${getStatusTextColor(dep.status)}`}>
                    {dep.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Resources (aesthetic placeholder) */}
      <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-4 shrink-0 text-[10px] text-muted-foreground font-semibold uppercase">
        <div className="flex items-center space-x-1.5">
          <Cpu className="w-3.5 h-3.5 text-primary/75" />
          <span>CPU: 12%</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-primary/75" />
          <span>RAM: 4.8 / 16 GB</span>
        </div>
      </div>
    </div>
  );
}
