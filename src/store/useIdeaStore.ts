import { create } from "zustand";

export interface Idea {
  id: string;
  content: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
  source: string;
  status: string;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IdeaState {
  ideas: Idea[];
  loading: boolean;
  error: string | null;
  setIdeas: (ideas: Idea[]) => void;
  fetchIdeas: () => Promise<void>;
  addIdea: (content: string, projectId?: string) => Promise<Idea | undefined>;
  updateIdea: (id: string, data: Partial<Pick<Idea, "status" | "starred" | "content">>) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
}

export const useIdeaStore = create<IdeaState>((set, get) => ({
  ideas: [],
  loading: false,
  error: null,

  setIdeas: (ideas) => set({ ideas, loading: false }),

  fetchIdeas: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/ideas");
      if (!res.ok) throw new Error("Failed to fetch ideas");
      const data = await res.json();
      set({ ideas: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      set({ error: message, loading: false });
    }
  },

  addIdea: async (content, projectId) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newIdea: Idea = {
      id: tempId,
      content,
      projectId: projectId ?? null,
      project: null,
      source: "manual",
      status: "raw",
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const previous = get().ideas;
    set({ ideas: [newIdea, ...previous] });

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, projectId }),
      });
      if (!res.ok) throw new Error("Failed to add idea");
      const saved: Idea = await res.json();
      set((state) => ({
        ideas: state.ideas.map((i) => (i.id === tempId ? saved : i)),
      }));
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      set({ ideas: previous, error: message });
    }
  },

  updateIdea: async (id, data) => {
    const previous = get().ideas;
    set((state) => ({
      ideas: state.ideas.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }));
    try {
      const res = await fetch(`/api/ideas?ideaId=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update idea");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      set({ ideas: previous, error: message });
    }
  },

  deleteIdea: async (id) => {
    const previous = get().ideas;
    set((state) => ({ ideas: state.ideas.filter((i) => i.id !== id) }));
    try {
      const res = await fetch(`/api/ideas?ideaId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete idea");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      set({ ideas: previous, error: message });
    }
  },
}));
