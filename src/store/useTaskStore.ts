import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

interface TaskState {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "completed">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const defaultTasks: Task[] = [
  {
    id: "task-1",
    title: "Implement widget layout save & restore state",
    dueDate: new Date().toISOString().split("T")[0],
    completed: true,
    priority: "high"
  },
  {
    id: "task-2",
    title: "Fix ICE negotiation race conditions in stranger chat",
    dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0],
    completed: false,
    priority: "high"
  },
  {
    id: "task-3",
    title: "Write documentation for editorial scraping quotas",
    dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0],
    completed: false,
    priority: "medium"
  }
];

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: defaultTasks,
      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: `task-${Date.now()}`,
          completed: false
        };
        set((state) => ({
          tasks: [newTask, ...state.tasks]
        }));
      },
      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? { ...t, completed: !t.completed } : t
          )
        }));
      },
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id)
        }));
      }
    }),
    {
      name: "devos-tasks-storage"
    }
  )
);
