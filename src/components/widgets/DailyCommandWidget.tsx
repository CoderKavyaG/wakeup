"use client";

import React from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Terminal, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export function DailyCommandWidget() {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const { showTips } = useLayoutStore();

  const staleProjects = projects.filter((p) => p.status === "stale");
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const taskCompletionRate = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;

  // Mocking developer metrics for aesthetic and functionality
  const commitStreak = 5;

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3 shrink-0">
        <Terminal className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-semibold tracking-wide uppercase text-foreground">System Status</h2>
      </div>

      {/* Grid of Command stats */}
      <div className="grid grid-cols-2 gap-2 my-auto py-1">
        {/* Streak */}
        <div className="p-2.5 bg-card border border-border rounded flex items-center justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground uppercase font-semibold">Streak</div>
            <div className="text-sm font-mono text-foreground">{commitStreak}d</div>
          </div>
          <Terminal className="w-3.5 h-3.5 text-primary opacity-40" />
        </div>

        {/* Stale Projects Alert */}
        <div className="p-2.5 bg-card border border-border rounded flex items-center justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground uppercase font-semibold">Stale</div>
            <div className="text-sm font-mono text-foreground">{staleProjects.length}</div>
          </div>
          <AlertCircle className={`w-3.5 h-3.5 ${staleProjects.length > 0 ? 'text-red-400' : 'text-muted-foreground'} opacity-40`} />
        </div>

        {/* Pending Tasks */}
        <div className="p-2.5 bg-card border border-border rounded flex items-center justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground uppercase font-semibold">Tasks</div>
            <div className="text-sm font-mono text-foreground">{pendingTasks.length}</div>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-primary opacity-40" />
        </div>

        {/* Momentum */}
        <div className="p-2.5 bg-card border border-border rounded flex items-center justify-between">
          <div>
            <div className="text-[9px] text-muted-foreground uppercase font-semibold">Progress</div>
            <div className="text-sm font-mono text-foreground">{taskCompletionRate}%</div>
          </div>
          <TrendingUp className="w-3.5 h-3.5 text-primary opacity-40" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1 shrink-0 mt-auto pt-2 border-t border-border">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold text-muted-foreground uppercase">Progress</span>
          <span className="font-mono text-foreground">{taskCompletionRate}%</span>
        </div>
        <div className="h-1.5 bg-popover rounded overflow-hidden border border-border">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${taskCompletionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
