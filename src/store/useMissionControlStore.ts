import { create } from "zustand";

export interface WorkflowInsight {
  id: string;
  category: "alert" | "opportunity" | "focus" | "momentum" | "context";
  title: string;
  description: string;
  actionable: boolean;
  urgency: "high" | "medium" | "low";
  relatedItems: {
    projectIds?: string[];
    taskIds?: string[];
    noteIds?: string[];
  };
  suggestedAction?: {
    label: string;
    action: () => void;
  };
}

export interface DeveloperContext {
  currentPhase: "planning" | "active-coding" | "review" | "deployment" | "idle";
  primaryFocus?: {
    projectId: string;
    projectName: string;
  };
  focusScore: number; // 0-100: how focused is dev on current project
  contextSwitchCount: number; // tasks completed in session
  estimatedProductivity: number; // 0-100
  stateMetadata: {
    lastActiveProject?: string;
    lastActiveProjectTime?: Date;
    sessionDuration: number; // minutes
    interruptionCount: number;
  };
}

export interface MissionControlState {
  // Intelligence Data
  insights: WorkflowInsight[];
  context: DeveloperContext;
  recommendations: {
    nextAction?: string;
    focusRecommendation?: string;
    riskFlags: string[];
  };
  
  // Aggregated Metrics
  systemHealth: {
    activeProjects: number;
    completedTodayTasks: number;
    capturedNotes: number;
    codeCommitStreak: number;
    estimatedVelocity: number; // tasks/hour
  };
  
  // Loading & Errors
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
  
  // Methods
  refreshIntelligence: () => Promise<void>;
  getContextForProject: (projectId: string) => void;
  applyRecommendation: (recommendation: string) => void;
}

const defaultContext: DeveloperContext = {
  currentPhase: "idle",
  focusScore: 0,
  contextSwitchCount: 0,
  estimatedProductivity: 0,
  stateMetadata: {
    sessionDuration: 0,
    interruptionCount: 0,
  },
};

export const useMissionControlStore = create<MissionControlState>((set) => ({
  insights: [],
  context: defaultContext,
  recommendations: {
    riskFlags: [],
  },
  systemHealth: {
    activeProjects: 0,
    completedTodayTasks: 0,
    capturedNotes: 0,
    codeCommitStreak: 0,
    estimatedVelocity: 0,
  },
  loading: false,
  error: null,
  lastUpdated: undefined,
  
  refreshIntelligence: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed to fetch intelligence");
      const data = await res.json();
      set({
        insights: data.insights,
        context: data.context,
        recommendations: data.recommendations,
        systemHealth: data.systemHealth,
        lastUpdated: new Date(),
        loading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      set({ error: errorMessage, loading: false });
    }
  },
  
  getContextForProject: (projectId: string) => {
    // Context analysis for specific project
    console.log(`Analyzing context for project: ${projectId}`);
  },
  
  applyRecommendation: (recommendation: string) => {
    console.log(`Applying recommendation: ${recommendation}`);
  },
}));
