import { create } from "zustand";

export type ProjectStatus = "planning" | "active" | "completed" | "stale" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  githubUrl?: string;
  liveUrl?: string;
  folderPath?: string;
  feedback?: { id: string; text: string; date: string }[];
  
  // Project Intelligence & Developer Memory Fields
  summary?: string;
  architectureNotes?: string;
  deploymentInfo?: string;
  screenshots?: string[];
  techStack?: string[];
  resumeBullet?: string;
  interviewNotes?: string;
  projectHealth?: number;
  momentumScore?: number;
  nextAction?: string;
  completionPercentage?: number;

  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, "id" | "updatedAt">) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      set({ projects: data, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage, loading: false });
    }
  },

  addProject: async (project) => {
    const tempId = `temp-${Date.now()}`;
    const newProject: Project = {
      ...project,
      id: tempId,
      updatedAt: new Date().toISOString(),
      projectHealth: 100.0,
      momentumScore: 0.0,
      completionPercentage: 0.0,
    };

    // Optimistic update
    const previousProjects = get().projects;
    set({ projects: [newProject, ...previousProjects] });

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });

      if (!res.ok) throw new Error("Failed to add project");
      const savedProject = await res.json();

      // Replace temp project with real saved project
      set((state) => ({
        projects: state.projects.map((p) => (p.id === tempId ? savedProject : p)),
      }));
    } catch (err) {
      // Revert optimistic update
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ projects: previousProjects, error: errorMessage });
    }
  },

  updateProject: async (id, updates) => {
    const previousProjects = get().projects;

    // Optimistic update
    set({
      projects: previousProjects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    });

    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) throw new Error("Failed to update project");
      const savedProject = await res.json();

      // Update with exact server payload
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? savedProject : p)),
      }));
    } catch (err) {
      // Revert
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ projects: previousProjects, error: errorMessage });
    }
  },

  deleteProject: async (id) => {
    const previousProjects = get().projects;

    // Optimistic update
    set({ projects: previousProjects.filter((p) => p.id !== id) });

    try {
      const res = await fetch(`/api/projects?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete project");
    } catch (err) {
      // Revert
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ projects: previousProjects, error: errorMessage });
    }
  },
}));
