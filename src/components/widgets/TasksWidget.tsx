"use client";

import React, { useState } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square, Plus, Trash2, Clock, AlertTriangle } from "lucide-react";

export function TasksWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTaskStore();
  const { showTips } = useLayoutStore();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [filter, setFilter] = useState<"all" | "active" | "overdue" | "completed">("all");

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      dueDate: dueDate || undefined,
      priority,
    });

    setTitle("");
    setDueDate("");
    setPriority("medium");
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "bg-popover text-foreground border-red-500/20";
      case "medium":
        return "bg-popover text-foreground border-yellow-500/20";
      default:
        return "bg-popover text-foreground border-blue-500/20";
    }
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  };

  const getFriendlyCountdown = (dateStr?: string) => {
    if (!dateStr) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `overdue by ${Math.abs(diffDays)}d`;
    }
    if (diffDays === 0) {
      return "due today";
    }
    if (diffDays === 1) {
      return "due tomorrow";
    }
    return `due in ${diffDays} days`;
  };

  // Sort logic: active (uncompleted) first, then high priority first, then proximity of due dates
  const sortedTasks = [...tasks].sort((a, b) => {
    // 1. Completion status
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 2. Priority weight
    const pWeight = { high: 3, medium: 2, low: 1 };
    const aWeight = pWeight[a.priority] || 2;
    const bWeight = pWeight[b.priority] || 2;
    if (aWeight !== bWeight) {
      return bWeight - aWeight;
    }
    // 3. Due dates proximity
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const filteredTasks = sortedTasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    if (filter === "overdue") return !t.completed && isOverdue(t.dueDate);
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-4 h-4 text-primary " />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Tasks & Milestones</h2>
        </div>
      </div>

      {showTips && (
        <div className="mb-3 p-3 bg-popover border border-amber-500/20 text-[10px] text-foreground rounded-lg select-none leading-relaxed shrink-0">
          ⚡ **Task DevTools Tips**: Use this dashboard to organize your checklist. Set priorities (`High`, `Medium`, `Low`) to auto-sync momentum points to your Daily Command Widget. Tasks are saved persistently inside PostgreSQL.
        </div>
      )}

      {/* Task Filters */}
      <div className="flex space-x-1.5 mb-3 shrink-0">
        {(["all", "active", "overdue", "completed"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "secondary" : "ghost"}
            className="text-[9px] h-6 px-2 font-semibold uppercase tracking-wider"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Task Creation Form inline */}
      <form onSubmit={handleAddTask} className="grid grid-cols-1 gap-2 mb-3 shrink-0 bg-popover/20 border border-border/50 rounded-lg p-2.5">
        <Input
          placeholder="Add next action item..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 text-xs bg-popover border-border text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 text-xs bg-popover border-border text-foreground w-1/2 py-0"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
            className="h-8 px-2 rounded-md bg-popover border border-border text-foreground text-[11px] focus:outline-none w-1/3"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Button type="submit" size="sm" className="h-8 bg-primary hover:bg-primary/95 text-white flex-1 text-xs font-bold">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>

      {/* Tasks List */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No tasks matching this filter.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const overdue = isOverdue(task.dueDate) && !task.completed;
              return (
                <div
                  key={task.id}
                  className={`flex items-start justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                    task.completed
                      ? "bg-popover/10 border-border/30 opacity-60"
                      : overdue 
                      ? "bg-red-500/5 border-red-500/20 hover:border-red-500/30"
                      : "bg-popover/40 border-border/80 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5 text-muted-foreground hover:text-primary shrink-0 transition-colors"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${task.completed ? "line-through text-muted-foreground font-normal" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <Badge variant="outline" className={`text-[8px] uppercase px-1 py-0 border font-bold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span className={`text-[9px] font-medium flex items-center space-x-1 ${overdue ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                            {overdue ? <AlertTriangle className="w-2.5 h-2.5 text-foreground shrink-0" /> : <Clock className="w-2.5 h-2.5 shrink-0" />}
                            <span>{getFriendlyCountdown(task.dueDate)} ({task.dueDate})</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTask(task.id)}
                    className="w-7 h-7 rounded-md text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

