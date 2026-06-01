"use client";

import React, { useState, useEffect } from "react";
import { CockpitCommand } from "./CockpitCommand";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useUrlStore } from "@/store/useUrlStore";
import { Lock, Unlock, Bookmark, X, Search } from "lucide-react";
import { Button } from "../ui/button";
import { QuickLinksWidget } from "../widgets/QuickLinksWidget";
import { AnimatePresence, motion } from "framer-motion";
import { SessionBriefing } from "./SessionBriefing";
import { Download } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isLocked, toggleLock, resetLayout, clearLayout, setLayouts, saveCurrentLayout, loadSavedLayout, savedLayout } = useLayoutStore();
  const { isQuickLinksOpen, toggleQuickLinks } = useUrlStore();

  // Removed switchProfile logic as per request

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0f0f11] text-[#E8E9EB]">
      <CockpitCommand />

      {/* Top Controls Bar */}
      <div className="shrink-0 px-6 pt-4 pb-3 flex items-center justify-between gap-4 select-none bg-[#0f0f11] border-b border-white/5" style={{ WebkitAppRegion: "drag" } as any}>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-foreground flex items-center justify-center font-bold text-background text-[13px] shadow-sm border border-white/10">
            D
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">DevOS</h1>
            <span className="w-1 h-1 rounded-full bg-white/20"></span>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {isLocked ? "Locked" : "Edit mode"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2" style={{ WebkitAppRegion: "no-drag" } as any}>

        {typeof window !== 'undefined' && (window as any).electronAPI?.isElectron && (
          <div className="flex items-center gap-2 mr-4 bg-[#161618] border border-white/5 px-3 py-1.5 rounded-lg">
            <button onClick={() => (window as any).electronAPI.minimize()}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
            <button onClick={() => (window as any).electronAPI.maximize()}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
            <button onClick={() => (window as any).electronAPI.close()}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
          </div>
        )}
        <div className="flex items-center space-x-2 bg-[#161618] border border-white/5 p-1 rounded-lg">
          {/* Lock/Unlock */}
          <Button
            onClick={toggleLock}
            variant="ghost"
            size="sm"
            className={`h-6 text-[10px] uppercase tracking-wider font-bold gap-1.5 px-2.5 rounded hover:bg-white/5 ${
              isLocked ? "text-rose-400" : "text-green-400"
            }`}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {isLocked ? "Locked" : "Drag Mode"}
          </Button>

          <div className="w-px h-4 bg-white/10 mx-1"></div>

          {/* Cockpit Command Trigger */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-1.5 h-6 px-2.5 rounded hover:bg-white/5 text-muted-foreground transition-colors text-[10px] uppercase tracking-wider font-bold"
          >
            <Search className="w-3 h-3" />
            <span>Cockpit</span>
            <kbd className="bg-white/5 px-1 rounded text-[8px] font-mono border border-white/10 ml-1">⌘K</kbd>
          </button>

          <div className="w-px h-4 bg-white/10 mx-1"></div>

          {/* Layout Restore */}
          {mounted && savedLayout && (
            <>
              <Button
                onClick={loadSavedLayout}
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] uppercase tracking-wider font-bold px-2.5 rounded hover:bg-white/5 text-muted-foreground flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" /> Restore Layout
              </Button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
            </>
          )}

          {/* Clear */}
          <Button
            onClick={clearLayout}
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] uppercase tracking-wider font-bold px-2.5 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground"
          >
            Clear Grid
          </Button>
        </div>
        </div>
      </div>

      <SessionBriefing />

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
          >
            {isQuickLinksOpen ? <X className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </main>
    </div>
  );
}
