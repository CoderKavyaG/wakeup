"use client";

import { create } from "zustand";

export type SearchResultType = "project" | "task" | "note" | "url" | "github";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  metadata?: {
    status?: string;
    priority?: string;
    dueDate?: string;
    tags?: string[];
    url?: string;
    updatedAt?: string;
  };
  relevanceScore: number; // 0-100, how well does it match the query
  matchedFields: string[]; // Which fields matched (title, description, tags, etc)
}

export interface SearchFilters {
  types?: SearchResultType[]; // Filter by result type
  status?: string[]; // For projects/tasks: active, stale, completed, etc
  priority?: string[]; // For tasks: high, medium, low
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  tags?: string[]; // Match any tag
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  recentSearches: string[];
  
  // Methods
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clearSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  filters: {},
  results: [],
  loading: false,
  error: null,
  isOpen: false,
  recentSearches: [],

  setQuery: (query: string) => {
    set({ query });
  },

  setFilters: (filters: SearchFilters) => {
    set({ filters });
  },

  search: async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      set({ results: [], query: "" });
      return;
    }

    set({ 
      query, 
      filters: filters || get().filters,
      loading: true, 
      error: null 
    });

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query, 
          filters: filters || get().filters 
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      set({ 
        results: data.results || [],
        loading: false 
      });

      // Add to recent searches
      get().addRecentSearch(query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search error occurred";
      set({ 
        error: errorMessage, 
        loading: false,
        results: []
      });
    }
  },

  clearSearch: () => {
    set({ 
      query: "", 
      results: [], 
      filters: {},
      error: null 
    });
  },

  openSearch: () => {
    set({ isOpen: true });
  },

  closeSearch: () => {
    set({ isOpen: false });
  },

  addRecentSearch: (query: string) => {
    const { recentSearches } = get();
    const filtered = recentSearches.filter(q => q !== query);
    set({ recentSearches: [query, ...filtered].slice(0, 10) });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));
