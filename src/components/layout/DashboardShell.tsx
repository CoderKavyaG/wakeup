"use client";

import React from "react";
import { CommandPalette } from "./CommandPalette";
import { SearchCommandPalette } from "../widgets/SearchCommandPalette";
import { useLayoutStore } from "@/store/useLayoutStore";
import { Lock, Unlock } from "lucide-react";
import { Button } from "../ui/button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isLocked, toggleLock, resetLayout, clearLayout, setLayouts } = useLayoutStore();

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

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground">
      <CommandPalette />
      <SearchCommandPalette />

      {/* Top Controls Bar */}
      <div className="shrink-0 px-6 py-3 border-b border-border bg-card flex items-center justify-between gap-4 select-none">
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
          {/* Profile Switcher */}
          <div className="flex items-center space-x-1 border border-border bg-background rounded px-2 h-7">
            <span className="text-[9px] uppercase font-bold text-muted-foreground select-none">View:</span>
            <select
              onChange={(e) => switchProfile(e.target.value as any)}
              className="bg-transparent border-0 outline-none text-xs text-foreground font-medium cursor-pointer pr-1 focus:ring-0 focus:outline-none"
              defaultValue="standard"
            >
              <option value="standard" className="bg-card text-foreground">Standard</option>
              <option value="deep" className="bg-card text-foreground">Deep Work</option>
              <option value="dsa" className="bg-card text-foreground">Coding</option>
              <option value="interview" className="bg-card text-foreground">Interview</option>
              <option value="shipping" className="bg-card text-foreground">Shipping</option>
            </select>
          </div>

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

          {/* Seed Demo */}
          <Button
            onClick={resetLayout}
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] font-semibold px-3 rounded-lg border border-border hover:bg-muted text-foreground"
          >
            Seed Layout
          </Button>

          {/* Clear */}
          <Button
            onClick={clearLayout}
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] font-semibold px-3 rounded-lg border border-border/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-muted-foreground"
          >
            Clear
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
