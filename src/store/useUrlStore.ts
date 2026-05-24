import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ResourceUrl {
  id: string;
  label: string;
  url: string;
  category: "docs" | "deployment" | "github" | "other";
}

interface UrlState {
  urls: ResourceUrl[];
  addUrl: (url: Omit<ResourceUrl, "id">) => void;
  deleteUrl: (id: string) => void;
}

const defaultUrls: ResourceUrl[] = [
  {
    id: "url-1",
    label: "DevOS Live Dev Server",
    url: "http://localhost:3000",
    category: "deployment"
  },
  {
    id: "url-2",
    label: "Next.js App Router Docs",
    url: "https://nextjs.org/docs",
    category: "docs"
  },
  {
    id: "url-3",
    label: "DevOS GitHub Repo",
    url: "https://github.com/TPAteeq/wake-up",
    category: "github"
  }
];

export const useUrlStore = create<UrlState>()(
  persist(
    (set) => ({
      urls: defaultUrls,
      addUrl: (url) => {
        const newUrl: ResourceUrl = {
          ...url,
          id: `url-${Date.now()}`
        };
        set((state) => ({
          urls: [newUrl, ...state.urls]
        }));
      },
      deleteUrl: (id) => {
        set((state) => ({
          urls: state.urls.filter((u) => u.id !== id)
        }));
      }
    }),
    {
      name: "devos-urls-storage"
    }
  )
);
