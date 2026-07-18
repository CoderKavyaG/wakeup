import { create } from "zustand";
import { useProjectStore } from "./useProjectStore";
import { useTaskStore } from "./useTaskStore";
import { useNoteStore } from "./useNoteStore";
import { useUrlStore } from "./useUrlStore";
import { useLayoutStore } from "./useLayoutStore";
import { useIdeaStore } from "./useIdeaStore";

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
  ai: { hasGroqApiKey: boolean; hasOpenrouterApiKey: boolean } | null;
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
  ai: null,
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
      // Curation migration for existing users
      if (typeof window !== "undefined") {
        const phases = ["launched", "in_development", "sketching", "idea"];
        let hasMigrationData = false;
        const migrationOrderedIds: string[] = [];

        phases.forEach(phase => {
          const stored = localStorage.getItem(`devos_curated_${phase}`);
          if (stored) {
            hasMigrationData = true;
            try {
              const list = JSON.parse(stored) as string[];
              migrationOrderedIds.push(...list);
            } catch {}
          }
        });

        if (hasMigrationData && migrationOrderedIds.length > 0) {
          try {
            await fetch("/api/projects/reorder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderedIds: migrationOrderedIds })
            });
          } catch (err) {
            console.error("Curation migration failed:", err);
          }
          phases.forEach(phase => {
            localStorage.removeItem(`devos_curated_${phase}`);
          });
        }
      }

      const localToken = typeof window !== "undefined" ? localStorage.getItem("GITHUB_TOKEN") : null;
      const localUsername = typeof window !== "undefined" ? localStorage.getItem("GITHUB_USERNAME") : null;
      
      const headers: Record<string, string> = {};
      if (localToken) {
        headers["x-github-token-migrate"] = localToken;
      }
      if (localUsername) {
        headers["x-github-username-migrate"] = localUsername;
      }

      // Single parallel DB call — replaces fetchTasks, fetchNotes, fetchProjects, fetchUrls
      const [bootstrapRes] = await Promise.all([
        fetch("/api/bootstrap", { headers }),
        // Layout has complex merge logic — keep using its own fetch
        useLayoutStore.getState().fetchLayout(),
      ]);

      if (!bootstrapRes.ok) throw new Error("Bootstrap failed");
      const data = await bootstrapRes.json();

      if (localToken) {
        localStorage.removeItem("GITHUB_TOKEN");
      }

      // Hydrate all stores at once — no waterfalls, no race conditions
      useProjectStore.getState().setProjects(data.projects ?? []);
      useTaskStore.getState().setTasks(data.tasks ?? []);
      useNoteStore.getState().setNotes(data.notes ?? []);
      useUrlStore.getState().setUrls(data.urls ?? []);
      useIdeaStore.getState().setIdeas(data.ideas ?? []);

      set({
        loaded: true,
        loading: false,
        derived: data.derived ?? null,
        vercel: data.vercel ?? null,
        ai: data.ai ?? null,
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
