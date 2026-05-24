"use client";

import React from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Terminal, Flame, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export function DailyCommandWidget() {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();

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
      <div className="flex items-center space-x-2 mb-2 shrink-0">
        <Terminal className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Daily Command</h2>
      </div>

      {/* Grid of Command stats */}
      <div className="grid grid-cols-2 gap-3 my-auto py-1">
        {/* Streak */}
        <div className="p-3 bg-popover/40 border border-border/80 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 rounded text-amber-400">
            <Flame className="w-4 h-4 fill-amber-500/15" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Commit Streak</div>
            <div className="text-sm font-bold text-foreground">{commitStreak} Days</div>
          </div>
        </div>

        {/* Stale Projects Alert */}
        <div className="p-3 bg-popover/40 border border-border/80 rounded-lg flex items-center space-x-3">
          <div className={`p-2 rounded ${staleProjects.length > 0 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Stale Projects</div>
            <div className="text-sm font-bold text-foreground">{staleProjects.length} Pending</div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="p-3 bg-popover/40 border border-border/80 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Pending Tasks</div>
            <div className="text-sm font-bold text-foreground">{pendingTasks.length} Active</div>
          </div>
        </div>

        {/* Momentum */}
        <div className="p-3 bg-popover/40 border border-border/80 rounded-lg flex items-center space-x-3">
          <div className="p-2 bg-green-500/10 rounded text-green-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Momentum</div>
            <div className="text-sm font-bold text-foreground">{taskCompletionRate}% Done</div>
          </div>
        </div>
      </div>

      {/* Momentum Progress Bar */}
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-muted-foreground uppercase">Daily Velocity</span>
          <span className="font-mono text-foreground font-bold">{taskCompletionRate}%</span>
        </div>
        <div className="h-2 bg-popover rounded-full overflow-hidden border border-border/50">
          <div 
            className="h-full bg-primary transition-all duration-500 rounded-full" 
            style={{ width: `${taskCompletionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
