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
import { TerminalWidget } from "../widgets/TerminalWidget";
import { PortfolioWidget } from "../widgets/PortfolioWidget";
import { SocialWidget } from "../widgets/SocialWidget";
import { WidgetShell } from "./WidgetShell";
import { FolderOpen, GitBranch, Crosshair, Terminal, Globe, Zap } from "lucide-react";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function GridWorkspace() {
  const { layouts, widgets, setLayouts, removeWidget, isLocked } = useLayoutStore();
  const [mounted, setMounted] = useState(false);

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
      case "portfolio":
        return <PortfolioWidget />;
      case "social":
        return <SocialWidget />;
      case "terminal":
        return <TerminalWidget initialCwd={widget.metadata?.initialCwd} />;
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
      case "portfolio":
        return { title: "coderkavyag.me", icon: <Globe className="w-3.5 h-3.5 text-blue-400" /> };
      case "social":
        return { title: "social drafts", icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> };
      default:
        return { title: widget.type, icon: <Terminal className="w-3.5 h-3.5 text-zinc-400" /> };
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
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
              className="bg-[#0d0d10] border border-white/[0.06] rounded-xl shadow-md flex flex-col overflow-hidden hover:border-white/10 transition-colors duration-200"
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
