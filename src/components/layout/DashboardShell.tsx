"use client";

import React, { useState } from "react";
import { useLayoutStore, WidgetType } from "@/store/useLayoutStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useNoteStore } from "@/store/useNoteStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutGrid, 
  Terminal as TerminalIcon, 
  GitBranch, 
  Plus, 
  Trash2, 
  FolderPlus, 
  CheckSquare, 
  FileText, 
  Link as LinkIcon, 
  Server, 
  RefreshCw, 
  User, 
  HelpCircle,
  Activity,
  Maximize2
} from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { addWidget, setLayouts, widgets } = useLayoutStore();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { notes } = useNoteStore();

  const [showWidgetDrawer, setShowWidgetDrawer] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Generate dynamic developer activity logs for high-fidelity interactive feel
  const getActivityLogs = () => {
    const logs = [];

    // System logs
    logs.push({
      id: "sys-init",
      icon: <Server className="w-3.5 h-3.5 text-primary" />,
      text: "DevOS environment initialized.",
      time: "Just now"
    });

    // Project logs
    projects.slice(0, 2).forEach((p, idx) => {
      logs.push({
        id: `log-proj-${p.id}`,
        icon: <FolderPlus className="w-3.5 h-3.5 text-green-400" />,
        text: `Registered project: ${p.name}`,
        time: idx === 0 ? "10m ago" : "1h ago"
      });
    });

    // Task logs
    tasks.slice(0, 3).forEach((t, idx) => {
      logs.push({
        id: `log-task-${t.id}`,
        icon: <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />,
        text: `${t.completed ? "Completed" : "Created"} task: ${t.title}`,
        time: idx === 0 ? "30m ago" : "2h ago"
      });
    });

    // Note logs
    notes.slice(0, 2).forEach((n, idx) => {
      logs.push({
        id: `log-note-${n.id}`,
        icon: <FileText className="w-3.5 h-3.5 text-purple-400" />,
        text: `Logged a developer thought in Brain Dump.`,
        time: idx === 0 ? "45m ago" : "3h ago"
      });
    });

    return logs.slice(0, 8); // Keep latest 8 logs
  };

  const activityLogs = getActivityLogs();

  const resetDashboard = () => {
    localStorage.removeItem("devos-layout-storage");
    window.location.reload();
  };

  const widgetTypesList: { type: WidgetType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: "projects", label: "Projects Registry", icon: <FolderPlus className="w-4 h-4" />, desc: "Track code repositories and status." },
    { type: "github", label: "GitHub Monitor", icon: <GitBranch className="w-4 h-4" />, desc: "Track commits and stale repos." },
    { type: "daily", label: "Daily Command", icon: <TerminalIcon className="w-4 h-4" />, desc: "Momentum tracking & metrics." },
    { type: "tasks", label: "Tasks & Deadlines", icon: <CheckSquare className="w-4 h-4" />, desc: "Interactive todo system." },
    { type: "notes", label: "Brain Dump", icon: <FileText className="w-4 h-4" />, desc: "Capture ideas instantly." },
    { type: "urls", label: "Resource Links", icon: <LinkIcon className="w-4 h-4" />, desc: "Save deployments and bookmarks." },
    { type: "health", label: "System Health", icon: <Server className="w-4 h-4" />, desc: "Latency & server monitors." },
  ];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background text-foreground select-none">
      {/* Left utility column */}
      <aside className="w-16 flex-shrink-0 border-r border-border bg-card flex flex-col items-center justify-between py-5 z-20">
        <div className="flex flex-col items-center space-y-6 w-full">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-white shadow-md shadow-primary/20">
            D
          </div>

          {/* Navigation Utilities */}
          <div className="flex flex-col items-center space-y-4 w-full px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowWidgetDrawer(!showWidgetDrawer)} 
                  variant="ghost" 
                  size="icon" 
                  className={`w-10 h-10 rounded-lg ${showWidgetDrawer ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground'}`}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Add Widget</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setRightSidebarOpen(!rightSidebarOpen)} 
                  variant="ghost" 
                  size="icon" 
                  className={`w-10 h-10 rounded-lg ${rightSidebarOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                >
                  <Activity className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Toggle Activity Stream</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={resetDashboard} 
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Reset Workspace Layout</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border-border text-foreground">
              <p className="text-xs font-bold">Documentation & Shortcuts</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-8 h-8 rounded-full bg-popover border border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Widget Customization Drawer Panel (Framer Motion Drawer) */}
        <AnimatePresence>
          {showWidgetDrawer && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-popover/95 backdrop-blur-md border-r border-border z-30 shadow-2xl flex flex-col p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Widget Workspace</h3>
                  <p className="text-[10px] text-muted-foreground">Drag custom widgets into cockpit shell.</p>
                </div>
                <Button 
                  onClick={() => setShowWidgetDrawer(false)} 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 rounded-md"
                >
                  ✕
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-2">
                {widgetTypesList.map((item) => {
                  const alreadyAdded = widgets.some(w => w.type === item.type);
                  return (
                    <div 
                      key={item.type} 
                      className="p-3 rounded-lg border border-border/80 bg-card/60 flex items-start justify-between hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div className="p-1.5 bg-primary/10 rounded-md text-primary shrink-0 mt-0.5">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-foreground block truncate">{item.label}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          addWidget(item.type);
                          setShowWidgetDrawer(false);
                        }}
                        disabled={alreadyAdded}
                        className="w-7 h-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 flex overflow-hidden h-full">
          {/* Dynamic Workspace Container */}
          <div className="flex-1 overflow-y-auto relative p-6 pb-24">
            {children}
          </div>

          {/* Right Live Activity Feed Panel */}
          <AnimatePresence>
            {rightSidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-shrink-0 border-l border-border bg-card overflow-hidden flex flex-col z-10"
              >
                <div className="p-5 flex items-center justify-between border-b border-border/60 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold tracking-wider uppercase text-secondary-foreground">Activity Stream</span>
                  </div>
                  <Badge className="bg-primary/15 text-primary border border-primary/20 text-[9px] uppercase leading-none py-0.5 px-1.5 font-bold rounded-full">
                    Live
                  </Badge>
                </div>

                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-2.5">
                      <div className="p-1.5 bg-popover border border-border rounded-md shrink-0 mt-0.5">
                        {log.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-foreground leading-snug font-medium">
                          {log.text}
                        </p>
                        <span className="text-[9px] text-muted-foreground/60 block mt-0.5 font-mono">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Cockpit Quick Dock Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="h-14 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-2xl flex items-center px-4 space-x-3.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowWidgetDrawer(true)} 
                  size="icon" 
                  variant="ghost" 
                  className="w-9 h-9 rounded-full bg-primary text-white hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Register New Widget</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-[1px] h-6 bg-border/80" />

            {/* Quick Link/Navigation Shortuct Icons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground">
                    <GitBranch className="w-4 h-4" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">GitHub Portal</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => addWidget("notes")} 
                  size="icon" 
                  variant="ghost" 
                  className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">New Thought Draft</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => addWidget("tasks")} 
                  size="icon" 
                  variant="ghost" 
                  className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Add Fast Task</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => addWidget("health")} 
                  size="icon" 
                  variant="ghost" 
                  className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <Server className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Deployment Cockpit</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
