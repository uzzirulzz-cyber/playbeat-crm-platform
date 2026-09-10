'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ViewKey =
  | 'dashboard'
  | 'leads'
  | 'segments'
  | 'whatsapp'
  | 'email'
  | 'campaigns'
  | 'templates'
  | 'messages'
  | 'analytics'
  | 'suppression'
  | 'integrations'
  | 'users'
  | 'audit-logs'
  | 'settings'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface ConsoleState {
  user: User | null
  view: ViewKey
  connectionStatus: { whatsapp: 'CONNECTED' | 'DISCONNECTED'; email: 'CONNECTED' | 'DISCONNECTED' }
  setUser: (u: User | null) => void
  setView: (v: ViewKey) => void
  setConnectionStatus: (s: Partial<ConsoleState['connectionStatus']>) => void
  logout: () => void
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set) => ({
      user: null,
      view: 'dashboard',
      connectionStatus: { whatsapp: 'DISCONNECTED', email: 'DISCONNECTED' },
      setUser: (u) => set({ user: u }),
      setView: (v) => set({ view: v }),
      setConnectionStatus: (s) => set((st) => ({ connectionStatus: { ...st.connectionStatus, ...s } })),
      logout: () => set({ user: null }),
    }),
    {
      name: 'leadpulse-console',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? window.localStorage : ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      } as any)),
      partialize: (s) => ({ user: s.user, view: s.view }),
    }
  )
)
