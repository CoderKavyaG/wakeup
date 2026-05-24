"use client";

import React from "react";
import { CockpitCommand } from "./CockpitCommand";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Lock, Unlock } from "lucide-react";
import { Button } from "../ui/button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLocked, toggleLock, resetLayout, clearLayout, setLayouts } = useLayoutStore();

  // Removed switchProfile logic as per request

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground">
      <CockpitCommand />

      {/* Top Controls Bar */}
      <div className="shrink-0 px-6 pt-6 pb-2 flex items-center justify-between gap-4 select-none bg-transparent">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center font-bold text-white text-xs shadow-sm shadow-primary/20">
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
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground transition-colors text-[11px] font-semibold"
          >
            <span>Cockpit</span>
            <kbd className="bg-muted px-1 rounded text-[9px] font-mono border border-border">⌘K</kbd>
          </button>



          {/* Clear */}
          <Button
            onClick={clearLayout}
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] font-semibold px-3 rounded-lg border border-border/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-muted-foreground"
          >
            Clear Workspace
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
