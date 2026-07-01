"use client";

import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useLayoutStore } from "@/store/useLayoutStore";
import { ProjectsWidget } from "../widgets/ProjectsWidget";
import { GithubWidget } from "../widgets/GithubWidget";
import { FocusPanelWidget } from "../widgets/FocusPanelWidget";
import { MachineControlWidget } from "../widgets/MachineControlWidget";
// import { TerminalWidget } from "../widgets/TerminalWidget";
import { WidgetShell } from "./WidgetShell";
import { FolderOpen, GitBranch, Crosshair, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { useSession } from "next-auth/react";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface TypewriterProps {
  text: string;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

function TerminalTypewriter({ text, delay = 12, className = "", onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const timer = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);

  return <span className={className}>{displayed}</span>;
}

export function GridWorkspace() {
  const { layouts, widgets, setLayouts, removeWidget, isLocked } = useLayoutStore();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const userName = session?.user?.name || "Developer";
  const [sequenceIndex, setSequenceIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onLayoutChange = (layout: any, allLayouts: any) => {
    const simplify = (obj: any) => {
      if (!obj) return "";
      return Object.entries(obj)
        .map(([bp, items]: any) => {
          if (!Array.isArray(items)) return "";
          return bp + ":" + items.map((l: any) => `${l.i}:${l.x},${l.y},${l.w},${l.h}`).sort().join(",");
        })
        .sort()
        .join("|");
    };

    if (simplify(layouts) !== simplify(allLayouts)) {
      setLayouts(allLayouts);
    }
  };

  const renderWidgetContent = (widget: any) => {
    switch (widget.type) {
      case "projects":
        return <ProjectsWidget />;
      case "github":
        return <GithubWidget />;
      case "focus":
        return <FocusPanelWidget />;
      case "machine":
        return <MachineControlWidget />;
      case "terminal":
        return <p className="text-muted-foreground text-sm p-4 font-mono">Terminal widget is temporarily disabled.</p>;
      default:
        return <p className="text-muted-foreground text-sm">Unknown widget: {widget.type}</p>;
    }
  };

  const getWidgetShellConfig = (widget: any) => {
    switch (widget.type) {
      case "projects":
        return { title: "projects", icon: <FolderOpen className="w-3.5 h-3.5 text-green-400" /> };
      case "github":
        return { title: "github monitor", icon: <GitBranch className="w-3.5 h-3.5 text-blue-400" /> };
      case "focus":
        return { title: "focus panel", icon: <Crosshair className="w-3.5 h-3.5 text-purple-400" /> };
      case "machine":
        return { title: "machine control", icon: <Terminal className="w-3.5 h-3.5 text-amber-400" /> };
      case "terminal":
        return { title: "terminal", icon: <Terminal className="w-3.5 h-3.5 text-zinc-400" /> };
      default:
        return { title: widget.type, icon: <Terminal className="w-3.5 h-3.5 text-zinc-400" /> };
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (widgets.length === 0) {
    return (
      <div className="h-[75vh] w-full flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-xl w-full border border-white/[0.08] bg-[#0c0c0f] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col font-mono"
        >
          {/* Terminal Window Header Bar */}
          <div className="h-9 bg-[#08080b] border-b border-white/[0.05] px-4 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider">DevOS Core Console</span>
            <div className="w-10" />
          </div>

          {/* Terminal Content */}
          <div className="p-6 space-y-4 text-xs text-left min-h-[220px]">
            <div className="space-y-1.5 min-h-[70px]">
              <p className="text-[#5B8DEF] font-bold">
                <TerminalTypewriter text="devos-kernel v1.0.4 initialized" onComplete={() => setSequenceIndex(1)} />
              </p>
              {sequenceIndex >= 1 && (
                <p className="text-white/40">
                  <TerminalTypewriter text={`loading workspace profile components for ${userName}...`} onComplete={() => setSequenceIndex(2)} />
                </p>
              )}
              {sequenceIndex >= 2 && (
                <p className="text-amber-500/90 font-bold">
                  <TerminalTypewriter text="warning: 0 active layout widgets detected on screen." onComplete={() => setSequenceIndex(3)} />
                </p>
              )}
              {sequenceIndex >= 3 && (
                <p className="text-green-400 font-bold">
                  <TerminalTypewriter text={`welcome back, chief ${userName}. system status: ready.`} onComplete={() => setSequenceIndex(4)} />
                </p>
              )}
            </div>

            {sequenceIndex >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="h-px bg-white/[0.05] my-2" />

                <div className="space-y-3 leading-relaxed">
                  <p className="text-white/80 font-bold text-sm">Welcome to DevOS Dashboard Command Center</p>
                  <p className="text-white/50">
                    To build your layout, open the Cockpit overlay panel. You can search files, add system diagnostics widgets, track notes, and monitor running ports.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    onClick={() => {
                      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                      window.dispatchEvent(event);
                    }}
                    className="bg-[#5B8DEF] hover:bg-[#4a7cdb] text-white font-mono font-bold text-xs px-5 py-2 rounded border border-[#5B8DEF]/30 transition-all cursor-pointer shadow-lg w-full sm:w-auto"
                  >
                    Launch Cockpit Command [⌘K]
                  </Button>
                  <span className="text-[10px] text-white/30 hidden sm:inline">or press Ctrl + K anywhere</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Terminal Status Bar */}
          <div className="h-6 bg-[#08080b] border-t border-white/[0.05] px-4 flex items-center justify-between text-[9px] text-white/30 shrink-0">
            <span>root@devos:~#</span>
            <span>UTF-8</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveGridLayout
        className="layout animate-in fade-in duration-300"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={onLayoutChange}
        draggableHandle=".widget-drag-handle"
        margin={[20, 20]}
        useCSSTransforms={mounted}
        isDraggable={!isLocked}
        isResizable={!isLocked}
      >
        {widgets.map((widget) => {
          const config = getWidgetShellConfig(widget);
          return (
            <div
              key={widget.id}
              data-widget-type={widget.type}
              className="bg-[#0d0d10] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden transition-all duration-300 hover:border-red-500/40 hover:-translate-y-1 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.98),0_0_25px_2px_rgba(239,68,68,0.22)] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.95),0_0_12px_rgba(239,68,68,0.1)]"
            >
              <WidgetShell
                title={config.title}
                icon={config.icon}
                widgetType={widget.type}
                onClose={() => removeWidget(widget.id)}
              >
                {renderWidgetContent(widget)}
              </WidgetShell>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
