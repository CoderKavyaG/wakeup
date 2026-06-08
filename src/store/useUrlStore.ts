import { create } from "zustand";

export interface ResourceUrl {
  id: string;
  label: string;
  url: string;
  category: "docs" | "deployment" | "github" | "other";
}

interface UrlState {
  urls: ResourceUrl[];
  loading: boolean;
  error: string | null;
  isQuickLinksOpen: boolean;
  toggleQuickLinks: () => void;
  fetchUrls: () => Promise<void>;
  setUrls: (urls: ResourceUrl[]) => void;
  addUrl: (url: Omit<ResourceUrl, "id">) => Promise<void>;
  deleteUrl: (id: string) => Promise<void>;
  reorderUrls: (urls: ResourceUrl[]) => void;
}

export const useUrlStore = create<UrlState>((set, get) => ({
  urls: [],
  loading: false,
  error: null,
  isQuickLinksOpen: false,
  toggleQuickLinks: () => set((s) => ({ isQuickLinksOpen: !s.isQuickLinksOpen })),

  setUrls: (urls) => set({ urls, loading: false }),

  fetchUrls: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/urls");
      if (!res.ok) throw new Error("Failed to fetch URLs");
      const data = await res.json();
      set({ urls: data, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage, loading: false });
    }
  },

  addUrl: async (url) => {
    const tempId = `temp-${Date.now()}`;
    const newUrl: ResourceUrl = {
      ...url,
      id: tempId,
    };

    // Optimistic update
    const previousUrls = get().urls;
    set({ urls: [newUrl, ...previousUrls] });

    try {
      const res = await fetch("/api/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(url),
      });

      if (!res.ok) throw new Error("Failed to add URL");
      const savedUrl = await res.json();

      // Replace temp URL with real saved URL
      set((state) => ({
        urls: state.urls.map((u) => (u.id === tempId ? savedUrl : u)),
      }));
    } catch (err) {
      // Revert optimistic update
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ urls: previousUrls, error: errorMessage });
    }
  },

  deleteUrl: async (id) => {
    const previousUrls = get().urls;

    // Optimistic update
    set({ urls: previousUrls.filter((u) => u.id !== id) });

    try {
      const res = await fetch(`/api/urls?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete URL");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ urls: previousUrls, error: errorMessage });
    }
  },

  reorderUrls: (newUrls) => set({ urls: newUrls }),
}));
