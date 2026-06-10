"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { useProjectOSStore } from "@/store/useProjectOSStore";

interface WidgetShellProps {
  title: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  widgetType?: string;
}

export function WidgetShell({ title, icon, actions, onClose, children, widgetType }: WidgetShellProps) {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#0d0d10]">
      {/* Header */}
      <div className="h-8 border-b border-white/[0.04] bg-[#0a0a0f] flex items-center justify-between px-3 shrink-0 select-none">
        <div className="widget-drag-handle flex items-center gap-2 cursor-grab active:cursor-grabbing flex-1 h-full">
          {/* 2x3 dot SVG grid icon */}
          <svg
            width="8"
            height="12"
            viewBox="0 0 8 12"
            fill="none"
            className="text-white/20 shrink-0"
          >
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
            <circle cx="6" cy="2" r="1.2" fill="currentColor" />
            <circle cx="2" cy="6" r="1.2" fill="currentColor" />
            <circle cx="6" cy="6" r="1.2" fill="currentColor" />
            <circle cx="2" cy="10" r="1.2" fill="currentColor" />
            <circle cx="6" cy="10" r="1.2" fill="currentColor" />
          </svg>
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              {title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {widgetType === 'projects' && (
            <button
              onClick={() => useProjectOSStore.getState().open()}
              className="text-white/25 hover:text-white/70 transition-colors cursor-pointer mr-0.5"
              title="Open Project OS"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M6 2H2v12h12v-4M9 2h5v5M14 2L8 8"/>
              </svg>
            </button>
          )}
          {actions}
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="w-5 h-5 rounded-md text-white/30 hover:text-white hover:bg-white/5 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
