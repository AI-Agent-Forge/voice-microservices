import { create } from 'zustand'

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  data?: any
}

interface DebugState {
  logs: LogEntry[]
  isOpen: boolean
  addLog: (level: LogLevel, message: string, data?: any) => void
  clearLogs: () => void
  togglePanel: () => void
}

export const useDebugStore = create<DebugState>((set) => ({
  logs: [],
  isOpen: false,
  addLog: (level, message, data) => set((state) => ({
    logs: [
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        level,
        message,
        data
      },
      ...state.logs
    ].slice(0, 100) // Keep last 100 logs
  })),
  clearLogs: () => set({ logs: [] }),
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen }))
}))

// Helper to intercept console methods if needed
export const logger = {
  info: (message: string, data?: any) => useDebugStore.getState().addLog('info', message, data),
  warn: (message: string, data?: any) => useDebugStore.getState().addLog('warn', message, data),
  error: (message: string, data?: any) => useDebugStore.getState().addLog('error', message, data),
  success: (message: string, data?: any) => useDebugStore.getState().addLog('success', message, data),
}
