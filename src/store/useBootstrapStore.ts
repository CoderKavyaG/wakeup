import { create } from "zustand";
import { useProjectStore } from "./useProjectStore";
import { useTaskStore } from "./useTaskStore";
import { useNoteStore } from "./useNoteStore";
import { useUrlStore } from "./useUrlStore";
import { useLayoutStore } from "./useLayoutStore";

interface DerivedSignals {
  staleProjects: string[];
  overdueTasks: string[];
  todayTasks: string[];
  totalStale: number;
  totalOverdue: number;
  totalToday: number;
}

interface BootstrapState {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  derived: DerivedSignals | null;
  lastBootstrapped: number | null;
  bootstrap: () => Promise<void>;
}

export const useBootstrapStore = create<BootstrapState>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,
  derived: null,
  lastBootstrapped: null,

  bootstrap: async () => {
    // Guard: don't double-fetch if already loading or recently loaded (<30s ago)
    const { loading, lastBootstrapped } = get();
    if (loading) return;
    if (lastBootstrapped && Date.now() - lastBootstrapped < 30_000) return;

    set({ loading: true, error: null });

    try {
      // Single parallel DB call — replaces fetchTasks, fetchNotes, fetchProjects, fetchUrls
      const [bootstrapRes] = await Promise.all([
        fetch("/api/bootstrap"),
        // Layout has complex merge logic — keep using its own fetch
        useLayoutStore.getState().fetchLayout(),
      ]);

      if (!bootstrapRes.ok) throw new Error("Bootstrap failed");
      const data = await bootstrapRes.json();

      // Hydrate all stores at once — no waterfalls, no race conditions
      useProjectStore.getState().setProjects(data.projects ?? []);
      useTaskStore.getState().setTasks(data.tasks ?? []);
      useNoteStore.getState().setNotes(data.notes ?? []);
      useUrlStore.getState().setUrls(data.urls ?? []);

      set({
        loaded: true,
        loading: false,
        derived: data.derived ?? null,
        lastBootstrapped: Date.now(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Bootstrap error";
      console.error("[bootstrap]", message);
      set({ loading: false, error: message });
    }
  },
}));
