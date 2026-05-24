"use client";

import React, { useState } from "react";
import { useTaskStore, Task } from "@/store/useTaskStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2, Clock } from "lucide-react";

export function TasksWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useTaskStore();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

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
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(dateStr) < today;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Tasks & Deadlines</h2>
        </div>
      </div>

      {/* Task Creation Form inline */}
      <form onSubmit={handleAddTask} className="grid grid-cols-1 gap-2 mb-4 shrink-0 bg-popover/20 border border-border/50 rounded-lg p-2.5">
        <Input
          placeholder="New task..."
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
            onChange={(e) => setPriority(e.target.value as any)}
            className="h-8 px-2 rounded-md bg-popover border border-border text-foreground text-[11px] focus:outline-none w-1/3"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Button type="submit" size="sm" className="h-8 bg-primary hover:bg-primary/95 text-white flex-1 text-xs">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>

      {/* Tasks List */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-2">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No tasks found. Relax or add some.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                  task.completed
                    ? "bg-popover/10 border-border/30 opacity-60"
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
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                      <Badge variant="outline" className={`text-[9px] uppercase px-1 py-0 border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className={`text-[9px] flex items-center space-x-1 ${isOverdue(task.dueDate) && !task.completed ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span>{task.dueDate}</span>
                          {isOverdue(task.dueDate) && !task.completed && <span>(overdue)</span>}
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
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
