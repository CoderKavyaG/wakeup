import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Layout } from "react-grid-layout/legacy";

export type WidgetType = 
  | "projects" 
  | "github" 
  | "notes" 
  | "tasks" 
  | "urls" 
  | "health" 
  | "daily";

export interface WidgetInstance {
  id: string;
  type: WidgetType;
}

interface LayoutState {
  layouts: { [key: string]: Layout };
  widgets: WidgetInstance[];
  setLayouts: (layouts: { [key: string]: Layout }) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
}

const defaultLayouts: { [key: string]: Layout } = {
  lg: [
    { i: "projects-1", x: 0, y: 0, w: 7, h: 4, minW: 4, minH: 3 },
    { i: "daily-1", x: 7, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
    { i: "github-1", x: 0, y: 4, w: 7, h: 4, minW: 4, minH: 3 },
    { i: "tasks-1", x: 7, y: 3, w: 5, h: 4, minW: 3, minH: 3 },
    { i: "notes-1", x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
    { i: "urls-1", x: 4, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
    { i: "health-1", x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  ],
};

const defaultWidgets: WidgetInstance[] = [
  { id: "projects-1", type: "projects" },
  { id: "daily-1", type: "daily" },
  { id: "github-1", type: "github" },
  { id: "tasks-1", type: "tasks" },
  { id: "notes-1", type: "notes" },
  { id: "urls-1", type: "urls" },
  { id: "health-1", type: "health" },
];

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      layouts: defaultLayouts,
      widgets: defaultWidgets,
      setLayouts: (layouts) => set({ layouts }),
      addWidget: (type) => {
        const id = `${type}-${Date.now()}`;
        const newWidget = { id, type };
        
        // Add a default layout position for the new widget
        const currentLayouts = { ...get().layouts };
        const lgLayout = [...(currentLayouts.lg || [])];
        
        // Simple placement logic - append at bottom
        let maxY = 0;
        lgLayout.forEach(l => {
          if (l.y + l.h > maxY) maxY = l.y + l.h;
        });
        
        lgLayout.push({ i: id, x: 0, y: maxY, w: 4, h: 3 });
        currentLayouts.lg = lgLayout;
        
        set((state) => ({
          widgets: [...state.widgets, newWidget],
          layouts: currentLayouts
        }));
      },
      removeWidget: (id) => {
        set((state) => {
          const currentLayouts = { ...state.layouts };
          if (currentLayouts.lg) {
             currentLayouts.lg = currentLayouts.lg.filter((l) => l.i !== id);
          }
          return {
            widgets: state.widgets.filter((w) => w.id !== id),
            layouts: currentLayouts
          };
        });
      },
    }),
    {
      name: "devos-layout-storage",
    }
  )
);
