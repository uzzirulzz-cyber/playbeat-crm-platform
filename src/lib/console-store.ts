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
  appMode: 'storefront' | 'crm' | 'admin'
  view: ViewKey
  activeLeadId: string | null
  activeConversationId: string | null
  activeCallId: string | null
  // Storefront state
  cart: any[]
  connectionStatus: {
    whatsapp: 'CONNECTED' | 'DISCONNECTED'
    email: 'CONNECTED' | 'DISCONNECTED'
    metaCapi: 'CONNECTED' | 'DISCONNECTED'
    telephony: 'CONNECTED' | 'DISCONNECTED'
  }
  availability: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'
  setUser: (u: User | null) => void
  setAppMode: (m: 'storefront' | 'crm' | 'admin') => void
  setView: (v: ViewKey) => void
  setActiveLeadId: (id: string | null) => void
  setActiveConversationId: (id: string | null) => void
  setActiveCallId: (id: string | null) => void
  setConnectionStatus: (s: Partial<ConsoleState['connectionStatus']>) => void
  setAvailability: (a: ConsoleState['availability']) => void
  addToCart: (product: any) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  logout: () => void
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set) => ({
      user: null,
      appMode: 'storefront',
      view: 'dashboard',
      activeLeadId: null,
      activeConversationId: null,
      activeCallId: null,
      cart: [],
      connectionStatus: {
        whatsapp: 'DISCONNECTED',
        email: 'DISCONNECTED',
        metaCapi: 'DISCONNECTED',
        telephony: 'DISCONNECTED',
      },
      availability: 'ONLINE',
      setUser: (u) => set({ user: u }),
      setAppMode: (m) => set({ appMode: m }),
      setView: (v) => set({ view: v }),
      setActiveLeadId: (id) => set({ activeLeadId: id }),
      setActiveConversationId: (id) => set({ activeConversationId: id }),
      setActiveCallId: (id) => set({ activeCallId: id }),
      setConnectionStatus: (s) => set((st) => ({ connectionStatus: { ...st.connectionStatus, ...s } })),
      setAvailability: (a) => set({ availability: a }),
      addToCart: (product) => set((st) => {
        const existing = st.cart.find((c) => c.productId === product.id)
        if (existing) {
          return { cart: st.cart.map((c) => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c) }
        }
        return { cart: [...st.cart, { productId: product.id, name: product.name, price: product.salePrice || product.price, qty: 1, type: product.type, deliveryType: product.deliveryType }] }
      }),
      removeFromCart: (productId) => set((st) => ({ cart: st.cart.filter((c) => c.productId !== productId) })),
      clearCart: () => set({ cart: [] }),
      logout: () => set({ user: null, appMode: 'storefront' }),
    }),
    {
      name: 'playbeat-crm',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? window.localStorage : ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      } as any)),
      partialize: (s) => ({ user: s.user, appMode: s.appMode, view: s.view, availability: s.availability, cart: s.cart }),
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
