import { create } from "zustand";

export interface Note {
  id: string;
  content: string;
  projectId?: string;
  category?: string;
  createdAt: string;
}

interface NoteState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  addNote: (content: string, projectId?: string, category?: string) => Promise<Note | undefined>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,

  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      set({ notes: data, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ error: errorMessage, loading: false });
    }
  },

  addNote: async (content, projectId, category) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newNote: Note = {
      id: tempId,
      content,
      projectId,
      category,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    const previousNotes = get().notes;
    set({ notes: [newNote, ...previousNotes] });

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, projectId, category }),
      });

      if (!res.ok) throw new Error("Failed to add note");
      const savedNote = await res.json();

      // Replace temp note with real saved note
      set((state) => ({
        notes: state.notes.map((n) => (n.id === tempId ? savedNote : n)),
      }));
      return savedNote;
    } catch (err) {
      // Revert optimistic update
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ notes: previousNotes, error: errorMessage });
    }
  },

  deleteNote: async (id) => {
    const previousNotes = get().notes;

    // Optimistic update
    set({ notes: previousNotes.filter((n) => n.id !== id) });

    try {
      const res = await fetch(`/api/notes?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete note");
    } catch (err) {
      // Revert
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      set({ notes: previousNotes, error: errorMessage });
    }
  },
}));
