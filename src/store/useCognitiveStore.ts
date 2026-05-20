"use client";

import { create } from "zustand";

export interface DailyBriefing {
  staleWarnings: string[];
  momentumInsights: string[];
  focusRecommendations: string[];
  unfinishedAlerts: string[];
  generatedAt: Date;
}

export interface CognitiveState {
  briefing: DailyBriefing | null;
  loading: boolean;
  error: string | null;
  
  generateBriefing: () => Promise<void>;
  clearBriefing: () => void;
}

export const useCognitiveStore = create<CognitiveState>((set) => ({
  briefing: null,
  loading: false,
  error: null,

  generateBriefing: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/intelligence/briefing");
      if (!response.ok) throw new Error("Failed to generate briefing");
      
      const data = await response.json();
      set({
        briefing: data.briefing,
        loading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Briefing error";
      set({ error: errorMessage, loading: false });
    }
  },

  clearBriefing: () => {
    set({ briefing: null });
  },
}));
