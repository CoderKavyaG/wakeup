"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  X,
  RefreshCw,
  AlertTriangle,
  GitCommit,
  FolderOpen,
  CheckCircle2,
  PlusCircle,
  FileText,
  Lightbulb,
  Loader2,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  metadata?: any;
}

interface TimelineStats {
  commitsPushed: number;
  tasksCompleted: number;
  activeProjects: number;
  staleProjects: number;
}

interface DiagnosticAlert {
  id: string;
  message: string;
}

interface ActivityLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogsDrawer({ isOpen, onClose }: ActivityLogsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/timeline", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to fetch timeline logs");
      }
      const data = await res.json();
      setEvents(data.timeline || []);
      setStats(data.weeklyReview || null);
      setDiagnostics(data.diagnostics || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTimeline();
    }
  }, [isOpen, fetchTimeline]);

  const groupEventsByDate = (eventList: TimelineEvent[]) => {
    const groups: Record<string, TimelineEvent[]> = {};
    eventList.forEach((event) => {
      const date = new Date(event.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let groupKey = "";
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });
    return groups;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderOpen className="w-3.5 h-3.5 text-blue-400" />;
      case "task-created":
        return <PlusCircle className="w-3.5 h-3.5 text-purple-400" />;
      case "task-completed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case "note":
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case "idea":
        return <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />;
      case "commit":
        return <GitCommit className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getEventBorderColor = (type: string) => {
    switch (type) {
      case "project":
        return "border-blue-500/20";
      case "task-created":
        return "border-purple-500/20";
      case "task-completed":
        return "border-green-500/20";
      case "note":
        return "border-amber-500/20";
      case "idea":
        return "border-yellow-500/20";
      default:
        return "border-white/5";
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isTelegramSource = (event: TimelineEvent) => {
    return (
      (event.metadata && event.metadata.source === "telegram") ||
      event.description.toLowerCase().includes("telegram") ||
      event.title.toLowerCase().includes("telegram")
    );
  };

  const dailyEvents = events;
  const weeklyEvents = events.filter(
    (e) => e.type === "project" || e.type === "task-completed" || e.type === "idea"
  );

  const displayedEvents = activeTab === "daily" ? dailyEvents : weeklyEvents;
  const groupedEvents = groupEventsByDate(displayedEvents);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 z-50 h-screen w-[360px] bg-[#0d0d10] border-l border-white/[0.08] flex flex-col overflow-hidden shadow-2xl font-sans"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0f] border-b border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-widest font-sans">
                  System Logs
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={fetchTimeline}
                  disabled={loading}
                  className="p-1 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Refresh logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 bg-[#0d0d10] border-b border-white/[0.04]">
              <div className="flex bg-white/[0.03] border border-white/5 rounded-lg p-0.5 select-none">
                <button
                  onClick={() => setActiveTab("daily")}
                  className={`flex-1 text-center py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    activeTab === "daily"
                      ? "bg-white/10 text-white shadow-sm font-sans"
                      : "text-white/40 hover:text-white/60 font-sans"
                  }`}
                >
                  Daily Activity
                </button>
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`flex-1 text-center py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    activeTab === "weekly"
                      ? "bg-white/10 text-white shadow-sm font-sans"
                      : "text-white/40 hover:text-white/60 font-sans"
                  }`}
                >
                  Weekly Review
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0d0d10] p-4 space-y-4">
              {diagnostics.length > 0 && (
                <div className="space-y-1.5 shrink-0">
                  <div className="text-[9px] font-bold text-rose-400/80 uppercase tracking-widest px-1 font-mono">
                    System Alerts ({diagnostics.length})
                  </div>
                  <div className="space-y-1.5 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3">
                    {diagnostics.map((diag) => (
                      <div key={diag.id} className="flex items-start gap-1.5 text-[10px] text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400/80" />
                        <span className="leading-normal font-sans">{diag.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "weekly" && stats && (
                <div className="space-y-1.5 shrink-0">
                  <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest px-1 font-mono">
                    Weekly Statistics
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2.5 text-center">
                      <div className="text-[8px] uppercase font-bold text-white/30 font-sans">Commits</div>
                      <div className="text-sm font-mono font-semibold text-white/80 mt-0.5">
                        {stats.commitsPushed}
                      </div>
                    </div>
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2.5 text-center">
                      <div className="text-[8px] uppercase font-bold text-white/30 font-sans">Tasks Cleared</div>
                      <div className="text-sm font-mono font-semibold text-green-400 mt-0.5">
                        {stats.tasksCompleted}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {loading && events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/30">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-sans">Loading logs...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-xs text-rose-400 font-sans">
                    {error}
                  </div>
                ) : Object.keys(groupedEvents).length === 0 ? (
                  <div className="text-center py-16 text-xs text-white/20 font-sans">
                    No activity recorded
                  </div>
                ) : (
                  Object.entries(groupedEvents).map(([date, eventList]) => (
                    <div key={date} className="space-y-2">
                      <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider px-1 font-mono">
                        {date}
                      </div>
                      <div className="space-y-2 pl-1 border-l border-white/[0.03] ml-2">
                        {eventList.map((event) => {
                          const isTelegram = isTelegramSource(event);
                          return (
                            <div
                              key={event.id}
                              className={`relative group flex gap-3 p-2.5 rounded-lg border ${getEventBorderColor(
                                event.type
                              )} bg-white/[0.01] hover:bg-white/[0.02] transition-all`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {getEventIcon(event.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-[11px] font-bold text-white/80 leading-tight font-sans">
                                    {event.title}
                                  </span>
                                  <span className="text-[8px] text-white/20 font-mono shrink-0">
                                    {formatTime(event.date)}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/50 leading-relaxed mt-0.5 break-words font-sans">
                                  {event.description}
                                </p>
                                {isTelegram && (
                                  <div className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/10 text-[7px] font-bold text-blue-400 uppercase tracking-widest font-mono">
                                    Telegram
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
