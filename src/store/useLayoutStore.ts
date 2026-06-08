import { create } from "zustand";
import { Layout } from "react-grid-layout/legacy";

export type WidgetType = 
  | "projects" 
  | "github" 
  | "focus" 
  | "machine"
  | "clock"
  | "terminal";

interface WidgetInstance {
  id: string;
  type: WidgetType;
  metadata?: Record<string, any>;
}

interface LayoutState {
  layouts: { [key: string]: Layout };
  widgets: WidgetInstance[];
  loading: boolean;
  error: string | null;
  isLocked: boolean;
  toggleLock: () => void;
  showTips: boolean;
  toggleTips: () => void;
  fetchLayout: () => Promise<void>;
  setLayouts: (layouts: { [key: string]: Layout }) => Promise<void>;
  addWidget: (type: WidgetType, metadata?: Record<string, any>) => Promise<void>;
  removeWidget: (id: string) => Promise<void>;
  resetLayout: () => Promise<void>;
  clearLayout: () => Promise<void>;
  savedLayout: { layouts: { [key: string]: Layout }; widgets: WidgetInstance[] } | null;
  saveCurrentLayout: () => void;
  loadSavedLayout: () => void;
}

const widgetConfigs: { [key in WidgetType]: { minW: number, minH: number, defaultW: number, defaultH: number } } = {
  projects: { minW: 3, minH: 3, defaultW: 4, defaultH: 4 },
  github: { minW: 3, minH: 3, defaultW: 4, defaultH: 4 },
  focus: { minW: 3, minH: 4, defaultW: 4, defaultH: 4 },
  machine: { minW: 4, minH: 6, defaultW: 6, defaultH: 6 },
  clock: { minW: 2, minH: 3, defaultW: 3, defaultH: 4 },
  terminal: { minW: 4, minH: 6, defaultW: 6, defaultH: 8 },
};

const defaultLayouts: { [key: string]: Layout } = {
  lg: [
    { i: "projects-1", x: 4, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "github-1", x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
    { i: "focus-1", x: 0, y: 4, w: 10, h: 5, minW: 4, minH: 4 },
    { i: "machine-1", x: 10, y: 4, w: 2, h: 6, minW: 4, minH: 6 },
  ],
};

const defaultWidgets: WidgetInstance[] = [
  { id: "projects-1", type: "projects" },
  { id: "github-1", type: "github" },
  { id: "focus-1", type: "focus" },
  { id: "machine-1", type: "machine" },
];

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layouts: defaultLayouts,
  widgets: defaultWidgets,
  loading: false,
  error: null,
  isLocked: true,
  toggleLock: () => set((state) => ({ isLocked: !state.isLocked })),
  showTips: false,
  toggleTips: () => set((state) => ({ showTips: !state.showTips })),
  savedLayout: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("devos_saved_layout") || "null") : null,


  fetchLayout: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/layouts");
      if (!res.ok) throw new Error("Failed to fetch layout");
      const data = await res.json();
      
      if (data) {
        set({
          layouts: (data.layouts as { [key: string]: Layout }) || defaultLayouts,
          widgets: (data.widgets as WidgetInstance[]) || defaultWidgets,
          loading: false
        });
      } else {
        // Create initial default on backend
        await fetch("/api/layouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layouts: defaultLayouts, widgets: defaultWidgets }),
        });
        set({ loading: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage, loading: false });
    }
  },

  setLayouts: async (layouts) => {
    set({ layouts });

    try {
      const res = await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts, widgets: get().widgets }),
      });

      if (!res.ok) throw new Error("Failed to save layout");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage });
    }
  },

  addWidget: async (type, metadata) => {
    const id = `${type}-${Date.now()}`;
    const newWidget: WidgetInstance = { id, type, metadata };
    
    const currentLayouts = { ...get().layouts };
    const lgLayout = [...(currentLayouts.lg || [])];
    
    let maxY = 0;
    lgLayout.forEach(l => {
      if (l.y + l.h > maxY) maxY = l.y + l.h;
    });
    
    const config = widgetConfigs[type] || { minW: 3, minH: 3, defaultW: 4, defaultH: 4 };
    
    lgLayout.push({ 
      i: id, 
      x: 0, 
      y: maxY, 
      w: config.defaultW, 
      h: config.defaultH, 
      minW: config.minW, 
      minH: config.minH 
    });
    currentLayouts.lg = lgLayout;

    const previousWidgets = get().widgets;
    const previousLayouts = get().layouts;

    set({
      widgets: [...previousWidgets, newWidget],
      layouts: currentLayouts
    });

    try {
      const res = await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: currentLayouts, widgets: [...previousWidgets, newWidget] }),
      });

      if (!res.ok) throw new Error("Failed to save widget layout");
    } catch (err: any) {
      set({ widgets: previousWidgets, layouts: previousLayouts, error: err.message });
    }
  },

  removeWidget: async (id) => {
    const previousWidgets = get().widgets;
    const previousLayouts = get().layouts;

    const updatedWidgets = previousWidgets.filter((w) => w.id !== id);
    const updatedLayouts = { ...previousLayouts };
    if (updatedLayouts.lg) {
      updatedLayouts.lg = updatedLayouts.lg.filter((l) => l.i !== id);
    }

    set({
      widgets: updatedWidgets,
      layouts: updatedLayouts
    });

    try {
      const res = await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: updatedLayouts, widgets: updatedWidgets }),
      });

      if (!res.ok) throw new Error("Failed to remove widget");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ widgets: previousWidgets, layouts: previousLayouts, error: errorMessage });
    }
  },

  resetLayout: async () => {
    set({
      layouts: defaultLayouts,
      widgets: defaultWidgets
    });

    try {
      await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: defaultLayouts, widgets: defaultWidgets }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage });
    }
  },

  clearLayout: async () => {
    set({
      layouts: { lg: [] },
      widgets: []
    });

    try {
      await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: { lg: [] }, widgets: [] }),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage });
    }
  },
  
  saveCurrentLayout: () => {
    const current = { layouts: get().layouts, widgets: get().widgets };
    if (typeof window !== "undefined") {
      localStorage.setItem("devos_saved_layout", JSON.stringify(current));
    }
    set({ savedLayout: current });
  },

  loadSavedLayout: async () => {
    const saved = get().savedLayout;
    if (saved) {
      set({ layouts: saved.layouts, widgets: saved.widgets });
      try {
        await fetch("/api/layouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'An error occurred' });
      }
    }
  }
}));
