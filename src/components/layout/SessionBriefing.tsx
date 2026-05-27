"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, FolderOpen, CheckSquare, GitBranch, AlertTriangle, ArrowRight } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { Button } from "../ui/button";

function getTimeSince(timestamp: number) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function SessionBriefing() {
  const [show, setShow] = useState(false);
  const [timeSince, setTimeSince] = useState<string>("a while ago");
  const [focusText, setFocusText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(true);
  
  const tasks = useTaskStore(s => s.tasks);
  const projects = useProjectStore(s => s.projects);
  const fetchedAiRef = useRef(false);

  useEffect(() => {
    const lastVisit = localStorage.getItem("devos_last_visit");
    const now = Date.now();
    
    // 4 hours = 4 * 60 * 60 * 1000 = 14400000 ms
    // For testing, if it's null, we also show it
    if (!lastVisit || now - parseInt(lastVisit) > 14400000) {
      if (lastVisit) {
        setTimeSince(getTimeSince(parseInt(lastVisit)));
      }
      setShow(true);
      fetchAiFocus();
    } else {
      // Just update it if they are active and it hasn't been 4 hours
      localStorage.setItem("devos_last_visit", now.toString());
    }
  }, []);

  const fetchAiFocus = async () => {
    if (fetchedAiRef.current) return;
    fetchedAiRef.current = true;
    
    try {
      const res = await fetch("/api/cockpit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "What should I focus on?" })
      });
      
      if (!res.ok) throw new Error("Failed to fetch focus");
      
      // Check if fallback json
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setFocusText(data.result || data.error || "No response.");
        setIsAiLoading(false);
        return;
      }
      
      const reader = res.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let accumulated = "";
      
      setIsAiLoading(false);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setFocusText(accumulated);
      }
    } catch (e) {
      setFocusText("Welcome back. Focus on your highest priority open task today.");
      setIsAiLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("devos_last_visit", Date.now().toString());
    setShow(false);
  };
  
  const handleGetStarted = () => {
    handleDismiss();
    // Dispatch a custom event to open cockpit
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true }));
  };

  if (!show) return null;

  // Computed metrics
  const todayDateStr = new Date().toISOString().split("T")[0];
  const overdueOrDueTodayTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate <= todayDateStr);
  const staleProjects = projects.filter(p => new Date(p.updatedAt).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const mostRecentProject = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const topTask = [...tasks].filter(t => !t.completed).sort((a, b) => {
    const pVal = { "high": 3, "medium": 2, "low": 1 };
    return pVal[b.priority as keyof typeof pVal] - pVal[a.priority as keyof typeof pVal];
  })[0];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full bg-[#0f0f11] border-b border-white/5 relative z-40 text-white shadow-2xl pb-4 md:pb-0"
        >
          <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 flex flex-col md:flex-row gap-8 items-start relative">
            <button 
              onClick={handleDismiss} 
              className="absolute top-4 right-4 md:top-6 md:right-6 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: Welcome & Metrics */}
            <div className="flex-1 space-y-6 w-full">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back, Kavya</h1>
                <p className="text-muted-foreground text-sm mt-1">Last active {timeSince}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#161618] border border-white/5 p-3 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-md"><GitBranch className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">New Commits</p>
                    <p className="text-sm font-medium">0 cached</p>
                  </div>
                </div>
                
                <div className="bg-[#161618] border border-white/5 p-3 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-md"><CheckSquare className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">Due / Overdue</p>
                    <p className="text-sm font-medium">{overdueOrDueTodayTasks.length} tasks</p>
                  </div>
                </div>
                
                <div className="bg-[#161618] border border-white/5 p-3 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-md"><AlertTriangle className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">Stale Projects</p>
                    <p className="text-sm font-medium">{staleProjects.length > 0 ? `${staleProjects.length} inactive` : "All active"}</p>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
