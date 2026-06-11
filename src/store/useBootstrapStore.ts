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

export interface VercelData {
  hasToken: boolean;
  deployments: any[];
  projects: any[];
  analytics: Record<string, any>;
}

interface BootstrapState {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  derived: DerivedSignals | null;
  vercel: VercelData | null;
  userId: string | null;
  telegramLinked: boolean;
  lastBootstrapped: number | null;
  bootstrap: (force?: boolean) => Promise<void>;
  setVercelToken: (token: string) => Promise<void>;
  removeVercelToken: () => Promise<void>;
}

export const useBootstrapStore = create<BootstrapState>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,
  derived: null,
  vercel: null,
  userId: null,
  telegramLinked: false,
  lastBootstrapped: null,

  bootstrap: async (force = false) => {
    // Guard: don't double-fetch if already loading or recently loaded (<30s ago)
    const { loading, lastBootstrapped } = get();
    if (loading) return;
    if (!force && lastBootstrapped && Date.now() - lastBootstrapped < 30_000) return;

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
        vercel: data.vercel ?? null,
        userId: data.userId ?? null,
        telegramLinked: !!data.telegramLinked,
        lastBootstrapped: Date.now(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Bootstrap error";
      console.error("[bootstrap]", message);
      set({ loading: false, error: message });
    }
  },

  setVercelToken: async (token: string) => {
    const res = await fetch("/api/vercel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update token");
    }
    await get().bootstrap(true);
  },

  removeVercelToken: async () => {
    const res = await fetch("/api/vercel", {
      method: "DELETE"
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to remove token");
    }
    set({
      vercel: {
        hasToken: false,
        deployments: [],
        projects: [],
        analytics: {}
      }
    });
  }
}));
