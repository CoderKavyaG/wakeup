"use client";

import React, { useState, useEffect } from "react";
import { CockpitCommand } from "./CockpitCommand";
import { OnboardingGuide } from "./OnboardingGuide";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useUrlStore } from "@/store/useUrlStore";
import { Lock, Unlock, Bookmark, X, Search, Trash2, Activity } from "lucide-react";
import { Button } from "../ui/button";
import { QuickLinksWidget } from "../widgets/QuickLinksWidget";
import { AnimatePresence, motion } from "framer-motion";
import AmbientBar from "./AmbientBar";
import { useBootstrapStore } from "@/store/useBootstrapStore";
import { useSession, signOut } from "next-auth/react";
import { useProjectOSStore } from "@/store/useProjectOSStore";
import { ProjectOS } from "./ProjectOS";
import { OnboardingKeysModal } from "./OnboardingKeysModal";
import { ActivityLogsDrawer } from "./ActivityLogsDrawer";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bypassMobile, setBypassMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      const isMobileSize = window.innerWidth < 720;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileSize || isMobileUA);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const { data: session } = useSession();
  const { isLocked, toggleLock, resetLayout, clearLayout, setLayouts, saveCurrentLayout, loadSavedLayout, savedLayout } = useLayoutStore();
  const { isQuickLinksOpen, toggleQuickLinks } = useUrlStore();
  const loaded = useBootstrapStore((s) => s.loaded);
  const isProjectOSOpen = useProjectOSStore((s) => s.isOpen);
  const ai = useBootstrapStore((s) => s.ai);

  const showKeysModal = loaded && ai && !ai.hasGroqApiKey && !ai.hasOpenrouterApiKey;

  if (mounted && isMobile && !bypassMobile) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0f0f11] text-white p-6 font-sans">
        <div className="max-w-md w-full border border-white/[0.08] bg-[#161619] rounded-2xl p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-rose-400 font-mono">
              Desktop Workspace Recommended
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              DevOS is a developer command center designed for larger screen dimensions. It relies on full-width widget layouts and interactive tiling that do not support mobile layouts.
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.04] space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">
              Suggested Action
            </p>
            <p className="text-xs text-white/50">
              Open this web application on your laptop or computer browser.
            </p>
          </div>

          <button
            onClick={() => setBypassMobile(true)}
            className="w-full py-2.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-xs font-semibold text-white/40 hover:text-white transition-all font-mono cursor-pointer"
          >
            → Force open desktop layout
          </button>
        </div>
      </div>
    );
  }

  if (mounted && showKeysModal) {
    return <OnboardingKeysModal />;
  }

  // Calculate user initial
  const userInitial = session?.user?.name
    ? session.user.name[0].toUpperCase()
    : session?.user?.email
      ? session.user.email[0].toUpperCase()
      : "D";

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0f0f11] text-[#E8E9EB] relative">
      <AnimatePresence>
        {!loaded && (
          <motion.div
            key="bootstrap-progress"
            className="fixed top-0 left-0 right-0 h-[2px] bg-[#5B8DEF] z-50 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              scaleX: { duration: 1.5, ease: "easeOut" },
              opacity: { duration: 0.3 }
            }}
          />
        )}
      </AnimatePresence>
      <CockpitCommand />
      <OnboardingGuide />

      {/* Top Controls Bar */}
      <div className="shrink-0 px-6 pt-4 pb-3 flex items-center justify-between gap-4 select-none bg-[#0f0f11] border-b border-white/5" style={{ WebkitAppRegion: "drag" } as any}>
        <div className="flex items-center space-x-2">
          {typeof window !== 'undefined' && (window as any).electronAPI?.isElectron && (
            <div className="flex items-center gap-1.5 mr-2" style={{ WebkitAppRegion: "no-drag" } as any}>
              <button 
                onClick={() => (window as any).electronAPI.close()}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer"
                title="Close"
              />
              <button 
                onClick={() => (window as any).electronAPI.minimize()}
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer"
                title="Minimize"
              />
              <button 
                onClick={() => (window as any).electronAPI.maximize()}
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer"
                title="Maximize"
              />
            </div>
          )}
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt="Avatar"
              className="w-7 h-7 rounded border border-white/10 object-cover shadow-sm"
            />
          ) : (
            <div className="w-7 h-7 rounded bg-[#5B8DEF] flex items-center justify-center font-bold text-white text-[13px] shadow-sm border border-white/10 uppercase font-mono">
              {userInitial}
            </div>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">
              {session?.user?.name || "DevOS"}
            </h1>
            <span className="w-1 h-1 rounded-full bg-white/20"></span>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {isLocked ? "Locked" : "Edit mode"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2" style={{ WebkitAppRegion: "no-drag" } as any}>
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
            id="cockpit-trigger"
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

          {/* Clear Grid */}
          <Button
            onClick={clearLayout}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground flex items-center justify-center cursor-pointer"
            title="Clear Grid"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        </div>
      </div>

      <AmbientBar />

      <main className="flex-1 overflow-y-auto p-6 relative">
        {children}

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
            onClick={() => setIsLogsOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all pointer-events-auto border bg-[#1a1a1d] text-muted-foreground border-white/10 hover:text-foreground hover:bg-[#252528] hover:border-white/20 cursor-pointer"
            title="System Logs"
          >
            <Activity className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleQuickLinks}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all pointer-events-auto border ${
              isQuickLinksOpen 
                ? "bg-white/10 text-white border-white/20 hover:bg-white/20" 
                : "bg-[#1a1a1d] text-muted-foreground border-white/10 hover:text-foreground hover:bg-[#252528] hover:border-white/20 cursor-pointer"
            }`}
            title="Quick Links"
          >
            {isQuickLinksOpen ? <X className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </main>

      <ActivityLogsDrawer isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />

      <AnimatePresence>
        {isProjectOSOpen && <ProjectOS />}
      </AnimatePresence>
    </div>
  );
}
