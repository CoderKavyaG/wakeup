"use client";

import React from "react";
import { CockpitCommand } from "./CockpitCommand";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useUrlStore } from "@/store/useUrlStore";
import { Lock, Unlock, Bookmark, X } from "lucide-react";
import { Button } from "../ui/button";
import { QuickLinksWidget } from "../widgets/QuickLinksWidget";
import { AnimatePresence, motion } from "framer-motion";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLocked, toggleLock, resetLayout, clearLayout, setLayouts } = useLayoutStore();
  const { isQuickLinksOpen, toggleQuickLinks } = useUrlStore();

  // Removed switchProfile logic as per request

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0f0f11] text-[#E8E9EB]">
      <CockpitCommand />

      {/* Top Controls Bar */}
      <div className="shrink-0 px-6 pt-6 pb-2 flex items-center justify-between gap-4 select-none bg-[#0f0f11]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center font-bold text-background text-base shadow-sm border border-white/10">
            D
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">DevOS</h1>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-mono uppercase">
              {isLocked ? "Locked" : "Edit mode"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">


          {/* Lock/Unlock */}
          <Button
            onClick={toggleLock}
            variant="ghost"
            size="sm"
            className={`h-7 text-[11px] font-semibold gap-1.5 px-3 rounded-lg border ${
              isLocked
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>Drag Mode</span>
              </>
            )}
          </Button>

          {/* Cockpit Command Trigger */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-muted-foreground transition-colors text-[11px] font-semibold"
          >
            <span>Cockpit</span>
            <kbd className="bg-white/5 px-1 rounded text-[9px] font-mono border border-white/10">⌘K</kbd>
          </button>



          {/* Clear */}
          <Button
            onClick={clearLayout}
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] font-semibold px-3 rounded-lg border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-muted-foreground"
          >
            Clear Workspace
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto p-6 relative">
        {children}

        {/* ── QUICK LINKS FAB & PANEL ── */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
          <AnimatePresence>
            {isQuickLinksOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="w-64 h-80 shadow-2xl rounded-xl border border-border/60 overflow-hidden pointer-events-auto bg-[#0f0f11]"
              >
                <QuickLinksWidget />
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={toggleQuickLinks}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all pointer-events-auto border ${
              isQuickLinksOpen 
                ? "bg-white/10 text-white border-white/20 hover:bg-white/20" 
                : "bg-[#1a1a1d] text-muted-foreground border-white/10 hover:text-foreground hover:bg-[#252528] hover:border-white/20"
            }`}
            title="Quick Links"
          >
            {isQuickLinksOpen ? <X className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </main>
    </div>
  );
}
