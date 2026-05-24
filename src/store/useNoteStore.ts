import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface NoteState {
  notes: Note[];
  addNote: (content: string) => void;
  deleteNote: (id: string) => void;
}

const defaultNotes: Note[] = [
  {
    id: "note-1",
    content: "Need to investigate ICE connection negotiation failure in real-time WebRTC app. Try ICE restart.",
    createdAt: new Date().toISOString()
  },
  {
    id: "note-2",
    content: "Optimize News平台 RSS aggregation: set strict quota limits of 60 top feeds + reserved slots.",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      notes: defaultNotes,
      addNote: (content) => {
        const newNote: Note = {
          id: `note-${Date.now()}`,
          content,
          createdAt: new Date().toISOString()
        };
        set((state) => ({
          notes: [newNote, ...state.notes]
        }));
      },
      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id)
        }));
      }
    }),
    {
      name: "devos-notes-storage"
    }
  )
);
