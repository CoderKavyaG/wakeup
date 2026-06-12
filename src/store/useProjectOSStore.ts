import { create } from 'zustand'

interface ProjectOSStore {
  isOpen: boolean
  selectedProjectId: string | null
  activeTab: 'overview' | 'ideas' | 'media' | 'tasks' | 'controlroom'
  activePhase: 'launched' | 'in_development' | 'sketching' | 'idea'
  commandPaletteOpen: boolean
  searchQuery: string
  open: (projectId?: string) => void
  close: () => void
  selectProject: (id: string | null) => void
  setTab: (tab: ProjectOSStore['activeTab']) => void
  setPhase: (p: 'launched' | 'in_development' | 'sketching' | 'idea') => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  setSearch: (q: string) => void
}

export const useProjectOSStore = create<ProjectOSStore>((set) => ({
  isOpen: false,
  selectedProjectId: null,
  activeTab: 'overview',
  activePhase: 'idea',
  commandPaletteOpen: false,
  searchQuery: '',
  open: (projectId) => set({ isOpen: true, selectedProjectId: projectId || null }),
  close: () => set({ isOpen: false }),
  selectProject: (id) => set({ selectedProjectId: id, activeTab: 'overview' }),
  setTab: (tab) => set({ activeTab: tab }),
  setPhase: (p) => set({ activePhase: p }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  setSearch: (q) => set({ searchQuery: q }),
}))
