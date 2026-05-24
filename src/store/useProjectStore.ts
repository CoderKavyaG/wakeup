import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProjectStatus = "planning" | "active" | "completed" | "stale";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  githubUrl?: string;
  liveUrl?: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  addProject: (project: Omit<Project, "id" | "updatedAt">) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const defaultProjects: Project[] = [
  {
    id: "proj-1",
    name: "DevOS Dashboard",
    description: "A customizable, draggable developer cockpit dashboard to centralize workflow and reduce context switching.",
    status: "active",
    tags: ["Next.js", "React Grid Layout", "Tailwind CSS", "Zustand"],
    githubUrl: "https://github.com/TPAteeq/wake-up",
    liveUrl: "http://localhost:3000",
    updatedAt: new Date().toISOString()
  },
  {
    id: "proj-2",
    name: "WebRTC Chat Platform",
    description: "Multi-user real-time stranger video chat using TURN relay server infrastructure and ICE restart negotiation.",
    status: "completed",
    tags: ["WebRTC", "Express", "Socket.io", "React"],
    githubUrl: "https://github.com/example/webrtc-chat",
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "proj-3",
    name: "News Editorial Scraper",
    description: "A strict quota-based RSS editorial scraping platform with automated category tagging.",
    status: "stale",
    tags: ["Python", "BeautifulSoup", "PostgreSQL", "Redis"],
    githubUrl: "https://github.com/example/news-scraper",
    updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() // stale
  }
];

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: defaultProjects,
      addProject: (project) => {
        const newProject: Project = {
          ...project,
          id: `proj-${Date.now()}`,
          updatedAt: new Date().toISOString()
        };
        set((state) => ({
          projects: [newProject, ...state.projects]
        }));
      },
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => 
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          )
        }));
      },
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id)
        }));
      }
    }),
    {
      name: "devos-project-storage"
    }
  )
);
