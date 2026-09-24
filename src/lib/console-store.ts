'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ViewKey =
  | 'dashboard'
  | 'inbox'
  | 'whatsapp'
  | 'calls'
  | 'dialer'
  | 'leads'
  | 'customers'
  | 'tasks'
  | 'followups'
  | 'templates'
  | 'campaigns'
  | 'reports'
  | 'employees'
  | 'segments'
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
  activeLeadId: string | null
  activeConversationId: string | null
  activeCallId: string | null
  connectionStatus: {
    whatsapp: 'CONNECTED' | 'DISCONNECTED'
    email: 'CONNECTED' | 'DISCONNECTED'
    metaCapi: 'CONNECTED' | 'DISCONNECTED'
    telephony: 'CONNECTED' | 'DISCONNECTED'
  }
  availability: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'
  setUser: (u: User | null) => void
  setView: (v: ViewKey) => void
  setActiveLeadId: (id: string | null) => void
  setActiveConversationId: (id: string | null) => void
  setActiveCallId: (id: string | null) => void
  setConnectionStatus: (s: Partial<ConsoleState['connectionStatus']>) => void
  setAvailability: (a: ConsoleState['availability']) => void
  logout: () => void
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set) => ({
      user: null,
      view: 'dashboard',
      activeLeadId: null,
      activeConversationId: null,
      activeCallId: null,
      connectionStatus: {
        whatsapp: 'DISCONNECTED',
        email: 'DISCONNECTED',
        metaCapi: 'DISCONNECTED',
        telephony: 'DISCONNECTED',
      },
      availability: 'ONLINE',
      setUser: (u) => set({ user: u }),
      setView: (v) => set({ view: v }),
      setActiveLeadId: (id) => set({ activeLeadId: id }),
      setActiveConversationId: (id) => set({ activeConversationId: id }),
      setActiveCallId: (id) => set({ activeCallId: id }),
      setConnectionStatus: (s) => set((st) => ({ connectionStatus: { ...st.connectionStatus, ...s } })),
      setAvailability: (a) => set({ availability: a }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'playbeat-crm',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? window.localStorage : ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      } as any)),
      partialize: (s) => ({ user: s.user, view: s.view, availability: s.availability }),
    }
  )
)

// Role hierarchy for permission checks
const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 1,
  SUPPORT: 2,
  EMPLOYEE: 3,
  TEAM_LEADER: 4,
  CAMPAIGN_MANAGER: 4,
  AGENT: 4,
  MANAGER: 5,
  ADMIN: 6,
  SUPER_ADMIN: 7,
}

export function hasMinRole(user: { role: string } | null, minRole: string): boolean {
  if (!user) return false
  return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0)
}
