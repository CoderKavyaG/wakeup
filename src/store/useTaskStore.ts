import { create } from "zustand";

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  projectId?: string;
  createdAt: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "completed">) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      set({ tasks: data, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage, loading: false });
    }
  },

  addTask: async (task) => {
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      ...task,
      id: tempId,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    const previousTasks = get().tasks;
    set({ tasks: [newTask, ...previousTasks] });

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });

      if (!res.ok) throw new Error("Failed to add task");
      const savedTask = await res.json();

      // Replace temp task with real saved task
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === tempId ? savedTask : t)),
      }));
    } catch (err) {
      // Revert optimistic update
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ tasks: previousTasks, error: errorMessage });
    }
  },

  toggleTask: async (id) => {
    const previousTasks = get().tasks;
    const taskToToggle = previousTasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    const updatedCompleted = !taskToToggle.completed;

    // Optimistic update
    set({
      tasks: previousTasks.map((t) =>
        t.id === id ? { ...t, completed: updatedCompleted } : t
      ),
    });

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: updatedCompleted }),
      });

      if (!res.ok) throw new Error("Failed to toggle task");
    } catch (err) {
      // Revert
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ tasks: previousTasks, error: errorMessage });
    }
  },

  deleteTask: async (id) => {
    const previousTasks = get().tasks;

    // Optimistic update
    set({ tasks: previousTasks.filter((t) => t.id !== id) });

    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");
    } catch (err) {
      // Revert
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ tasks: previousTasks, error: errorMessage });
    }
  },
}));
