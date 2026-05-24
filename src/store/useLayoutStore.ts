import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Layout } from "react-grid-layout";

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
  layouts: { [key: string]: Layout[] };
  widgets: WidgetInstance[];
  setLayouts: (layouts: { [key: string]: Layout[] }) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
}

const defaultLayouts: { [key: string]: Layout[] } = {
  lg: [
    { i: "projects-1", x: 0, y: 0, w: 6, h: 4 },
    { i: "daily-1", x: 6, y: 0, w: 6, h: 2 },
    { i: "github-1", x: 6, y: 2, w: 6, h: 4 },
    { i: "notes-1", x: 0, y: 4, w: 4, h: 3 },
  ],
};

const defaultWidgets: WidgetInstance[] = [
  { id: "projects-1", type: "projects" },
  { id: "daily-1", type: "daily" },
  { id: "github-1", type: "github" },
  { id: "notes-1", type: "notes" },
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
