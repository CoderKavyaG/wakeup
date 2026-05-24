"use client";

import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useLayoutStore, WidgetType } from "@/store/useLayoutStore";
import { ProjectsWidget } from "../widgets/ProjectsWidget";
import { GithubWidget } from "../widgets/GithubWidget";
import { NotesWidget } from "../widgets/NotesWidget";
import { DailyCommandWidget } from "../widgets/DailyCommandWidget";
import { TasksWidget } from "../widgets/TasksWidget";
import { UrlManagerWidget } from "../widgets/UrlManagerWidget";
import { DeploymentHealthWidget } from "../widgets/DeploymentHealthWidget";
import { X, GripHorizontal } from "lucide-react";
import { Button } from "../ui/button";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function GridWorkspace() {
  const { layouts, widgets, setLayouts, removeWidget } = useLayoutStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onLayoutChange = (layout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
    if (JSON.stringify(layouts) !== JSON.stringify(allLayouts)) {
      setLayouts(allLayouts as { [key: string]: Layout });
    }
  };

  const renderWidgetContent = (type: WidgetType) => {
    switch (type) {
      case "projects":
        return <ProjectsWidget />;
      case "github":
        return <GithubWidget />;
      case "notes":
        return <NotesWidget />;
      case "daily":
        return <DailyCommandWidget />;
      case "tasks":
        return <TasksWidget />;
      case "urls":
        return <UrlManagerWidget />;
      case "health":
        return <DeploymentHealthWidget />;
      default:
        return <p className="text-muted-foreground text-sm">Unknown widget: {type}</p>;
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
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="bg-card border border-border/80 rounded-xl shadow-md flex flex-col overflow-hidden hover:border-primary/20 transition-colors duration-200">
            {/* Widget Header with Drag Handle & Close Button */}
            <div className="h-9 border-b border-border/60 bg-popover/40 flex items-center justify-between px-3 shrink-0">
              <div className="widget-drag-handle flex items-center space-x-1.5 cursor-grab active:cursor-grabbing flex-1 h-full select-none">
                <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {widget.type}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeWidget(widget.id)}
                className="w-5 h-5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-popover"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Widget Body */}
            <div className="p-4 flex-1 overflow-hidden">
              {renderWidgetContent(widget.type)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
