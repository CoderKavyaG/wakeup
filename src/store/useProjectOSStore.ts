import { create } from 'zustand'

interface ProjectOSStore {
  isOpen: boolean
  selectedProjectId: string | null
  activeTab: 'overview' | 'ideas' | 'media' | 'braindump' | 'tasks' | 'controlroom'
  open: (projectId?: string) => void
  close: () => void
  selectProject: (id: string) => void
  setTab: (tab: ProjectOSStore['activeTab']) => void
}

export const useProjectOSStore = create<ProjectOSStore>((set) => ({
  isOpen: false,
  selectedProjectId: null,
  activeTab: 'overview',
  open: (projectId) => set({ isOpen: true, selectedProjectId: projectId || null }),
  close: () => set({ isOpen: false }),
  selectProject: (id) => set({ selectedProjectId: id, activeTab: 'overview' }),
  setTab: (tab) => set({ activeTab: tab }),
}))
