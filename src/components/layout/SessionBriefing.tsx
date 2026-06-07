"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, AlertTriangle } from "lucide-react";

interface Insight {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
  expiresAt: string;
}

export function SessionBriefing() {
  const [show, setShow] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [briefText, setBriefText] = useState("");
  const [displayedBrief, setDisplayedBrief] = useState("");
  const [staleCount, setStaleCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. Check visit gap on mount
  useEffect(() => {
    const lastVisit = localStorage.getItem("devos_last_visit");
    const now = Date.now();
    
    // 2 hours = 2 * 60 * 60 * 1000 = 7200000 ms
    const gap = lastVisit ? now - parseInt(lastVisit) : Infinity;

    const initializeBriefing = async () => {
      setLoading(true);
      try {
        if (gap > 7200000) {
          setShow(true);
          // Refresh insights in DB
          await fetch("/api/intelligence", { method: "POST" });
        }
        
        // Fetch current active, unread insights
        const res = await fetch("/api/intelligence");
        if (res.ok) {
          const data: Insight[] = await res.json();
          setInsights(data);
          
          // Propagate to global state for future InsightBar widgets
          if (typeof window !== "undefined") {
            (window as any).devosInsights = data;
            window.dispatchEvent(new CustomEvent("devos_insights_updated", { detail: data }));
          }

          // Parse categories
          const dailyBrief = data.find(i => i.type === "daily_brief");
          if (dailyBrief) {
            setBriefText(dailyBrief.content);
          } else {
            setBriefText("Welcome back, Kavya. DevOS is synchronized and ready for work.");
          }

          // Compute badge counts
          const staleWarnings = data.filter(i => i.type === "stale_warning");
          setStaleCount(staleWarnings.length);

          const overdueWarning = data.find(i => i.type === "overdue");
          if (overdueWarning) {
            // content format is "X overdue: ..." or we can parse metadata if added
            const match = overdueWarning.content.match(/^(\d+)\s+overdue/);
            setOverdueCount(match ? parseInt(match[1]) : 1);
          } else {
            setOverdueCount(0);
          }
        }
      } catch (err) {
        console.error("Failed to compile session briefing", err);
      } finally {
        setLoading(false);
      }
    };

    initializeBriefing();
  }, []);

  // 2. Typewriter Effect
  useEffect(() => {
    if (!briefText) return;
    
    let i = 0;
    setDisplayedBrief("");
    
    const timer = setInterval(() => {
      setDisplayedBrief((prev) => prev + briefText.charAt(i));
      i++;
      if (i >= briefText.length) {
        clearInterval(timer);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [briefText]);

  // 3. Click Handlers
  const handleStaleClick = () => {
    window.dispatchEvent(new CustomEvent("filter_stale_projects"));
  };

  const handleOverdueClick = () => {
    const el = document.querySelector('[data-widget-type="focus"]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      el.classList.add("ring-2", "ring-rose-500", "ring-offset-2", "ring-offset-[#0f0f11]", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-rose-500", "ring-offset-2", "ring-offset-[#0f0f11]");
      }, 3000);
    }
  };

  const handleDismiss = async () => {
    localStorage.setItem("devos_last_visit", Date.now().toString());
    setShow(false);
    
    // Optimistically mark all current insights as read
    try {
      await Promise.all(
        insights.map(insight =>
          fetch(`/api/intelligence/${insight.id}`, { method: "PATCH" })
        )
      );
    } catch (e) {
      console.error("Failed to dismiss insights", e);
    }
  };

  if (!show || insights.length === 0) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full bg-[#0f0f11] border-b border-white/5 relative z-40 text-white shadow-lg overflow-hidden shrink-0 select-none"
        >
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4 h-[44px]">
            {/* Left: Purple Indicator Dot */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-md shadow-purple-500/50 shrink-0 animate-pulse" />
              
              {/* Typewriter Text */}
              <p className="text-xs font-medium text-foreground truncate font-sans tracking-wide leading-none">
                {displayedBrief}
                {displayedBrief.length < briefText.length && (
                  <span className="inline-block w-1 h-3 bg-purple-500 ml-0.5 animate-pulse align-middle" />
                )}
              </p>
            </div>

            {/* Badges and Dismiss Button */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Stale Badge */}
              {staleCount > 0 && (
                <button
                  onClick={handleStaleClick}
                  className="h-6 px-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{staleCount} stale</span>
                </button>
              )}

              {/* Overdue Badge */}
              {overdueCount > 0 && (
                <button
                  onClick={handleOverdueClick}
                  className="h-6 px-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{overdueCount} overdue</span>
                </button>
              )}

              {/* Separator if badges are visible */}
              {(staleCount > 0 || overdueCount > 0) && (
                <span className="w-px h-4 bg-white/10 mx-1" />
              )}

              {/* Dismiss */}
              <button
                onClick={handleDismiss}
                className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-colors cursor-pointer"
                title="Dismiss briefing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
