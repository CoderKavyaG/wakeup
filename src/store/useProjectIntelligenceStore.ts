import { create } from "zustand";

export interface ProjectScore {
  health: number; // 0-100: Repository health
  priority: number; // 0-100: Should dev focus on this?
  urgency: number; // 0-100: How time-sensitive?
  momentum: number; // 0-100: Velocity/activity score
  stalenessDays: number; // Days since last update
}

export interface ProjectIntelligence {
  projectId: string;
  projectName: string;
  scores: ProjectScore;
  recommendation: {
    action: "focus" | "resume" | "maintain" | "defer" | "review";
    reason: string;
    suggestedNextStep: string;
    estimatedTimeToComplete?: string;
  };
  workflowPhase: "planning" | "active" | "review" | "maintenance" | "completed";
  contextClues: string[]; // Human-readable context
  riskFactors: string[]; // Potential blockers
}

export interface ProjectGrouping {
  label: string;
  description: string;
  projectIds: string[];
  recommendedOrder: string[]; // Priority-sorted project IDs
  focusTime: number; // Minutes recommended per project
}

export interface ProjectIntelligenceState {
  projectIntelligence: Map<string, ProjectIntelligence>;
  projectGroupings: ProjectGrouping[];
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
  
  // Methods
  refreshProjectIntelligence: () => Promise<void>;
  getProjectAnalysis: (projectId: string) => ProjectIntelligence | undefined;
  getGroupings: () => ProjectGrouping[];
  getNextProjectToFocus: () => ProjectIntelligence | undefined;
  getProjectsByWorkflow: (phase: string) => ProjectIntelligence[];
}

export const useProjectIntelligenceStore = create<ProjectIntelligenceState>((set, get) => ({
  projectIntelligence: new Map<string, ProjectIntelligence>(),
  projectGroupings: [],
  loading: false,
  error: null,
  lastUpdated: undefined,
  
  refreshProjectIntelligence: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/projects/intelligence");
      if (!res.ok) throw new Error("Failed to fetch project intelligence");
      const data = await res.json();
      
      // Convert array to Map
      const intelligenceMap = new Map<string, ProjectIntelligence>(
        data.projectIntelligence.map((pi: ProjectIntelligence) => [
          pi.projectId,
          pi,
        ])
      );
      
      set({
        projectIntelligence: intelligenceMap,
        projectGroupings: data.projectGroupings,
        lastUpdated: new Date(),
        loading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      set({ error: errorMessage, loading: false });
    }
  },
  
  getProjectAnalysis: (projectId: string) => {
    return get().projectIntelligence.get(projectId);
  },
  
  getGroupings: () => {
    return get().projectGroupings;
  },
  
  getNextProjectToFocus: () => {
    const intelligence = get().projectIntelligence;
    let maxPriority = -1;
    let nextProject: ProjectIntelligence | undefined;
    
    intelligence.forEach((pi) => {
      if (pi.scores.priority > maxPriority) {
        maxPriority = pi.scores.priority;
        nextProject = pi;
      }
    });
    
    return nextProject;
  },
  
  getProjectsByWorkflow: (phase: string) => {
    const intelligence = get().projectIntelligence;
    const results: ProjectIntelligence[] = [];
    
    intelligence.forEach((pi) => {
      if (pi.workflowPhase === phase) {
        results.push(pi);
      }
    });
    
    return results.sort((a, b) => b.scores.priority - a.scores.priority);
  },
}));
