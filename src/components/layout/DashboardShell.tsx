"use client";

import React, { useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { useLayoutStore, WidgetType } from "@/store/useLayoutStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useNoteStore } from "@/store/useNoteStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal as TerminalIcon, 
  GitBranch, 
  Plus, 
  FolderPlus, 
  CheckSquare, 
  FileText, 
  Link as LinkIcon, 
  Server, 
  RefreshCw, 
  User, 
  HelpCircle,
  Activity,
  Clock,
  TrendingUp,
  Sparkles,
  Award,
  Lock,
  Unlock,
  Lightbulb
} from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Badge } from "../ui/badge";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { addWidget, widgets, isLocked, toggleLock, showTips, toggleTips, clearLayout, resetLayout, setLayouts } = useLayoutStore();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { notes } = useNoteStore();

  const [showWidgetDrawer, setShowWidgetDrawer] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"stream" | "weekly" | "timeline">("stream");
  const [timelineData, setTimelineData] = useState<any>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string; type: "warning" | "success" | "info" }[]>([]);

  const fetchTimeline = async () => {
    try {
      const res = await fetch("/api/system/timeline");
      if (res.ok) {
        const data = await res.json();
        setTimelineData(data);
      }
    } catch (e) {
      console.warn("Failed to fetch timeline:", e);
    }
  };

  const switchProfile = (profile: "standard" | "deep" | "dsa" | "interview" | "shipping") => {
    const currentLayouts = { ...useLayoutStore.getState().layouts };
    if (!currentLayouts.lg) return;
    
    if (profile === "standard") {
      resetLayout();
      return;
    }

    let newLg = [...currentLayouts.lg];
    if (profile === "deep") {
      newLg = newLg.map(l => {
        if (l.i.includes("tasks")) return { ...l, x: 0, y: 0, w: 6, h: 4 };
        if (l.i.includes("notes")) return { ...l, x: 6, y: 0, w: 6, h: 4 };
        return { ...l, y: l.y + 4 };
      });
    } else if (profile === "dsa") {
      newLg = newLg.map(l => {
        if (l.i.includes("urls")) return { ...l, x: 0, y: 0, w: 8, h: 4 };
        if (l.i.includes("health")) return { ...l, x: 8, y: 0, w: 4, h: 4 };
        return { ...l, y: l.y + 4 };
      });
    } else if (profile === "interview") {
      newLg = newLg.map(l => {
        if (l.i.includes("projects")) return { ...l, x: 0, y: 0, w: 7, h: 4 };
        if (l.i.includes("notes")) return { ...l, x: 7, y: 0, w: 5, h: 4 };
        return { ...l, y: l.y + 4 };
      });
    } else if (profile === "shipping") {
      newLg = newLg.map(l => {
        if (l.i.includes("github")) return { ...l, x: 0, y: 0, w: 6, h: 4 };
        if (l.i.includes("health")) return { ...l, x: 6, y: 0, w: 6, h: 4 };
        return { ...l, y: l.y + 4 };
      });
    }

    setLayouts({ lg: newLg });
  };

  React.useEffect(() => {
    fetchTimeline();
  }, [tasks, projects, notes]);

  React.useEffect(() => {
    if (timelineData) {
      const newNotifs: any[] = [];
      if (timelineData.weeklyReview?.staleProjects > 0) {
        newNotifs.push({
          id: "stale-notif",
          text: `⚠️ Stale Projects: ${timelineData.weeklyReview.staleProjects} repositories need immediate update focus!`,
          type: "warning"
        });
      }
      if (timelineData.weeklyReview?.commitsPushed === 0) {
        newNotifs.push({
          id: "streak-notif",
          text: "🔥 Streak Warning: No commits pushed in the last 7 days! Ship a code changes to keep momentum.",
          type: "warning"
        });
      }
      setNotifications(newNotifs.slice(0, 2));
    }
  }, [timelineData]);

  React.useEffect(() => {
    // Dispatch a resize event to force react-grid-layout to recalculate width
    window.dispatchEvent(new Event("resize"));
  }, [rightSidebarOpen]);

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
      <CommandPalette />
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
              <TooltipTrigger
                render={
                  <Button 
                    onClick={() => setShowWidgetDrawer(!showWidgetDrawer)} 
                    variant="ghost" 
                    size="icon" 
                    className={`w-10 h-10 rounded-lg ${showWidgetDrawer ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground'}`}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                }
              />
              <TooltipContent side="right" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Add Widget</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    onClick={() => setRightSidebarOpen(!rightSidebarOpen)} 
                    variant="ghost" 
                    size="icon" 
                    className={`w-10 h-10 rounded-lg ${rightSidebarOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                  >
                    <Activity className="w-5 h-5" />
                  </Button>
                }
              />
              <TooltipContent side="right" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Toggle Activity Stream</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    onClick={resetDashboard} 
                    variant="ghost" 
                    size="icon" 
                    className="w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="right" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Reset Workspace Layout</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg text-muted-foreground">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              }
            />
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
            {/* Premium Workspace Controls Header */}
            <div className="mb-6 p-4 rounded-2xl bg-card/65 backdrop-blur-md border border-border/80 shadow-md flex items-center justify-between gap-4 select-none">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-foreground">DevOS Workspace Cockpit</h1>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase font-mono">
                    {isLocked ? "🔒 Layout Locked (Static Grid)" : "🔓 Layout Unlocked (Draggable & Resizable)"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Visual Profile Dropdown Switcher */}
                <div className="flex items-center space-x-1.5 border border-border bg-popover/40 rounded-lg px-2.5 h-8">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground select-none">Profile:</span>
                  <select 
                    onChange={(e) => switchProfile(e.target.value as any)}
                    className="bg-transparent border-0 outline-none text-xs text-foreground font-semibold cursor-pointer pr-1 focus:ring-0 focus:outline-none"
                    defaultValue="standard"
                  >
                    <option value="standard" className="bg-card text-foreground">Standard Layout</option>
                    <option value="deep" className="bg-card text-foreground">🧠 Deep Work</option>
                    <option value="dsa" className="bg-card text-foreground">💻 DSA Coding</option>
                    <option value="interview" className="bg-card text-foreground">👔 Interview Prep</option>
                    <option value="shipping" className="bg-card text-foreground">🚀 Shipping Mode</option>
                  </select>
                </div>

                {/* Onboarding tips toggle */}
                <Button
                  onClick={toggleTips}
                  variant="ghost"
                  size="sm"
                  className={`h-8 text-[11px] font-semibold gap-1.5 px-3 rounded-lg border ${
                    showTips 
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                      : "text-muted-foreground border-border hover:bg-muted"
                  }`}
                  title="Toggle helper tutorials / on-screen guides"
                >
                  <Lightbulb className={`w-3.5 h-3.5 ${showTips ? "fill-amber-400 text-amber-400" : ""}`} />
                  <span>DevTools Tips: {showTips ? "ON" : "OFF"}</span>
                </Button>

                {/* Lock/Unlock Toggle */}
                <Button
                  onClick={toggleLock}
                  variant="ghost"
                  size="sm"
                  className={`h-8 text-[11px] font-semibold gap-1.5 px-3 rounded-lg border ${
                    isLocked 
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                      : "bg-green-500/10 text-green-400 border-green-500/20"
                  }`}
                  title="Freeze widgets in place to prevent accidental moves"
                >
                  {isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Dashboard</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock / Drag Mode</span>
                    </>
                  )}
                </Button>

                {/* Seed Template */}
                <Button
                  onClick={resetLayout}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[11px] font-semibold px-3 rounded-lg border border-border hover:bg-muted text-foreground"
                  title="Load the standard multi-widget layout demo template"
                >
                  Seed Demo Layout
                </Button>

                {/* Clear Slate */}
                <Button
                  onClick={clearLayout}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[11px] font-semibold px-3 rounded-lg border border-border/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-muted-foreground"
                  title="Wipe the dashboard to create a clean, empty workstation"
                >
                  Clear Workspace
                </Button>
              </div>
            </div>

            {children}
          </div>          {/* Right Live Activity Feed Panel */}
          <AnimatePresence>
            {rightSidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-shrink-0 border-l border-border bg-card overflow-hidden flex flex-col z-10"
              >
                {/* Tabs switcher header */}
                <div className="border-b border-border/60 shrink-0 bg-muted/10 p-2 grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setActiveTab("stream")}
                    className={`py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                      activeTab === "stream"
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Stream
                  </button>
                  <button
                    onClick={() => setActiveTab("weekly")}
                    className={`py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                      activeTab === "weekly"
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className={`py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                      activeTab === "timeline"
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Timeline
                  </button>
                </div>

                {/* Tab content area */}
                <div className="flex-1 overflow-y-auto p-5">
                  {activeTab === "stream" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1 select-none">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Logs</span>
                        <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] px-1.5 py-0">
                          Active
                        </Badge>
                      </div>
                      <div className="space-y-4">
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
                    </div>
                  )}

                  {activeTab === "weekly" && (
                    <div className="space-y-4">
                      {/* Weekly Reflection card */}
                      <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Weekly Reflection</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed font-sans font-medium">
                          {timelineData?.weeklyReview?.feedbackSummary || "Analyzing dashboard productivity velocity metrics..."}
                        </p>
                      </div>

                      {/* Velocity Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 border border-border bg-popover/40 rounded-xl">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Commits Pushed</span>
                          <span className="text-xl font-bold font-mono text-green-400 block mt-0.5">
                            {timelineData?.weeklyReview?.commitsPushed ?? 0}
                          </span>
                        </div>
                        <div className="p-3 border border-border bg-popover/40 rounded-xl">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Tasks Cleared</span>
                          <span className="text-xl font-bold font-mono text-yellow-400 block mt-0.5">
                            {timelineData?.weeklyReview?.tasksCompleted ?? 0}
                          </span>
                        </div>
                        <div className="p-3 border border-border bg-popover/40 rounded-xl">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Active Projects</span>
                          <span className="text-xl font-bold font-mono text-blue-400 block mt-0.5">
                            {timelineData?.weeklyReview?.activeProjects ?? 0}
                          </span>
                        </div>
                        <div className="p-3 border border-border bg-popover/40 rounded-xl">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Stale Items</span>
                          <span className={`text-xl font-bold font-mono block mt-0.5 ${
                            (timelineData?.weeklyReview?.staleProjects ?? 0) > 0 ? "text-rose-400" : "text-muted-foreground"
                          }`}>
                            {timelineData?.weeklyReview?.staleProjects ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Momentum Score Progress */}
                      <div className="p-3 border border-border bg-popover/20 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                          <span>Developer Momentum</span>
                          <span className="text-primary font-mono">{timelineData?.weeklyReview?.totalMomentum ?? 0} XP</span>
                        </div>
                        <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, ((timelineData?.weeklyReview?.totalMomentum ?? 0) / 200) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Health Progress */}
                      <div className="p-3 border border-border bg-popover/20 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase">
                          <span>Portfolio Health</span>
                          <span className="text-green-400 font-mono">{timelineData?.weeklyReview?.averageProjectHealth ?? 100}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${timelineData?.weeklyReview?.averageProjectHealth ?? 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "timeline" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1 select-none">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Developer Timeline</span>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      
                      {!timelineData?.timeline || timelineData.timeline.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          No timeline events logged yet. Register projects or clear tasks to begin!
                        </div>
                      ) : (
                        <div className="relative pl-5 border-l border-border/80 space-y-6">
                          {timelineData.timeline.map((event: any, index: number) => {
                            const dateObj = new Date(event.date);
                            const formattedDate = dateObj.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            });

                            return (
                              <div key={event.id} className="relative group">
                                {/* Chronological Event Dot */}
                                <div className={`absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full border bg-card transition-colors ${
                                  event.type === "commit" ? "border-green-500 bg-green-500/10" :
                                  event.type === "task-completed" ? "border-yellow-500 bg-yellow-500/10" :
                                  event.type === "note" ? "border-purple-500 bg-purple-500/10" :
                                  "border-primary bg-primary/10"
                                }`} />

                                <div className="space-y-1">
                                  <span className="text-[9px] text-muted-foreground/60 font-mono block">
                                    {formattedDate}
                                  </span>
                                  <span className="text-xs font-bold text-foreground leading-snug block group-hover:text-primary transition-colors">
                                    {event.title}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-sans">
                                    {event.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Cockpit Quick Dock Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="h-14 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-2xl flex items-center px-4 space-x-3.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    onClick={() => setShowWidgetDrawer(true)} 
                    size="icon" 
                    variant="ghost" 
                    className="w-9 h-9 rounded-full bg-primary text-white hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Register New Widget</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-[1px] h-6 bg-border/80" />

            {/* Quick Link/Navigation Shortuct Icons */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="ghost" className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground">
                      <GitBranch className="w-4 h-4" />
                    </Button>
                  </a>
                }
              />
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">GitHub Portal</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    onClick={() => addWidget("notes")} 
                    size="icon" 
                    variant="ghost" 
                    className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">New Thought Draft</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    onClick={() => addWidget("tasks")} 
                    size="icon" 
                    variant="ghost" 
                    className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Add Fast Task</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    onClick={() => addWidget("health")} 
                    size="icon" 
                    variant="ghost" 
                    className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <Server className="w-4 h-4" />
                  </Button>
                }
              />
              <TooltipContent side="top" className="bg-popover border-border text-foreground">
                <p className="text-xs font-bold">Deployment Cockpit</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Floating Notification Toast Stack */}
      <div className="fixed bottom-24 left-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              className="pointer-events-auto p-4 bg-popover/90 backdrop-blur-md border border-border shadow-2xl rounded-xl flex items-start justify-between gap-3 text-xs leading-relaxed max-w-xs font-sans text-foreground"
            >
              <span>{notif.text}</span>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-muted-foreground hover:text-foreground font-bold shrink-0 ml-1 leading-none text-xs transition-colors"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
