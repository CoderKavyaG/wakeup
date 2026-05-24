"use client";

import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useLayoutStore } from "@/store/useLayoutStore";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function GridWorkspace() {
  const { layouts, widgets, setLayouts } = useLayoutStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="h-full w-full">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={onLayoutChange}
        draggableHandle=".widget-drag-handle"
        margin={[24, 24]}
        useCSSTransforms={mounted}
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="widget-drag-handle h-10 border-b border-border bg-popover/50 flex items-center px-4 cursor-grab active:cursor-grabbing shrink-0">
              <span className="text-sm font-medium text-foreground capitalize">{widget.type} Widget</span>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {/* Content for the widget */}
              <p className="text-muted-foreground text-sm">Content for {widget.type}</p>
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
