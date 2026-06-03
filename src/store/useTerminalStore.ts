import { create } from 'zustand'

interface TerminalStore {
  pendingCommand: { cwd: string; command: string } | null
  sendCommand: (cwd: string, command: string) => void
  clearCommand: () => void
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  pendingCommand: null,
  sendCommand: (cwd, command) => {
    console.log("ZUSTAND: sendCommand called:", cwd, command);
    set({ pendingCommand: { cwd, command } });
  },
  clearCommand: () => {
    console.log("ZUSTAND: clearCommand called");
    set({ pendingCommand: null });
  },
}))
