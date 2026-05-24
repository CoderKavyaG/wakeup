"use client";

import React from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Left utility column */}
      <aside className="w-16 flex-shrink-0 border-r border-border bg-card flex flex-col items-center py-4 z-10">
        {/* Utilities will go here */}
      </aside>

      {/* Main Workspace and Right Activity */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 flex overflow-hidden">
          {/* Center dynamic workspace (Grid will be placed here) */}
          <div className="flex-1 overflow-auto relative p-6">
            {children}
          </div>

          {/* Right live activity feed */}
          <aside className="w-80 flex-shrink-0 border-l border-border bg-card hidden xl:block z-10 overflow-auto">
            {/* Activity feed goes here */}
          </aside>
        </main>

        {/* Bottom quick-action dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="h-16 rounded-2xl bg-card border border-border shadow-lg flex items-center px-4 space-x-2">
             {/* Dock items go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
