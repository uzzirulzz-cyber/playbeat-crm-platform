'use client'

import { useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users, FolderTree, MessageCircle, Mail, Megaphone,
  FileText, Inbox, BarChart3, ShieldX, Plug, UserCog, History, Settings,
  Search, Bell, LogOut, Send, Wifi, WifiOff
} from 'lucide-react'
import { useConsole, type ViewKey } from '@/lib/console-store'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import DashboardView from '@/components/console/views/dashboard'
import LeadsView from '@/components/console/views/leads'
import SegmentsView from '@/components/console/views/segments'
import WhatsAppView from '@/components/console/views/whatsapp'
import EmailView from '@/components/console/views/email'
import CampaignsView from '@/components/console/views/campaigns'
import TemplatesView from '@/components/console/views/templates'
import MessagesView from '@/components/console/views/messages'
import AnalyticsView from '@/components/console/views/analytics'
import SuppressionView from '@/components/console/views/suppression'
import IntegrationsView from '@/components/console/views/integrations'
import UsersView from '@/components/console/views/users'
import AuditLogsView from '@/components/console/views/audit-logs'
import SettingsView from '@/components/console/views/settings'

const NAV: { key: ViewKey; label: string; icon: any; minRole?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'segments', label: 'Segments', icon: FolderTree },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'templates', label: 'Templates', icon: FileText },
  { key: 'messages', label: 'Messages', icon: Inbox },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'suppression', label: 'Suppression', icon: ShieldX },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'users', label: 'Users', icon: UserCog, minRole: 'ADMIN' },
  { key: 'audit-logs', label: 'Audit Logs', icon: History, minRole: 'ADMIN' },
  { key: 'settings', label: 'Settings', icon: Settings, minRole: 'ADMIN' },
]

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 1, AGENT: 2, CAMPAIGN_MANAGER: 3, ADMIN: 4, SUPER_ADMIN: 5,
}

export default function ConsoleShell() {
  const { user, view, setView, setUser, connectionStatus, setConnectionStatus, logout } = useConsole()

  // Verify session on mount + poll connection status
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await api<{ user: any }>('/api/me', {})
        if (mounted && r?.user) setUser(r.user)
      } catch {
        if (mounted) setUser(null)
      }
      try {
        const integrations = await api<{ integrations: any[] }>('/api/integrations')
        if (mounted) {
          const wa = integrations.integrations.find((i) => i.provider === 'WHATSAPP')
          const em = integrations.integrations.find((i) => i.provider === 'EMAIL')
          setConnectionStatus({
            whatsapp: wa?.status || 'DISCONNECTED',
            email: em?.status || 'DISCONNECTED',
          })
        }
      } catch {}
    })()
    const t = setInterval(async () => {
      try {
        const integrations = await api<{ integrations: any[] }>('/api/integrations')
        const wa = integrations.integrations.find((i) => i.provider === 'WHATSAPP')
        const em = integrations.integrations.find((i) => i.provider === 'EMAIL')
        setConnectionStatus({
          whatsapp: wa?.status || 'DISCONNECTED',
          email: em?.status || 'DISCONNECTED',
        })
      } catch {}
    }, 15000)
    return () => { mounted = false; clearInterval(t) }
  }, [setUser, setConnectionStatus])

  const visibleNav = useMemo(() => {
    if (!user) return []
    const lvl = ROLE_LEVEL[user.role] || 0
    return NAV.filter((n) => !n.minRole || lvl >= (ROLE_LEVEL[n.minRole] || 0))
  }, [user])

  async function doLogout() {
    try { await api('/api/auth/login', { method: 'DELETE' }) } catch {}
    logout()
    setUser(null)
  }

  if (!user) return null

  const ViewComp = (() => {
    switch (view) {
      case 'dashboard': return <DashboardView />
      case 'leads': return <LeadsView />
      case 'segments': return <SegmentsView />
      case 'whatsapp': return <WhatsAppView />
      case 'email': return <EmailView />
      case 'campaigns': return <CampaignsView />
      case 'templates': return <TemplatesView />
      case 'messages': return <MessagesView />
      case 'analytics': return <AnalyticsView />
      case 'suppression': return <SuppressionView />
      case 'integrations': return <IntegrationsView />
      case 'users': return <UsersView />
      case 'audit-logs': return <AuditLogsView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  })()

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-900">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-zinc-900 text-zinc-100 border-r border-zinc-800">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">LeadPulse</span>
            <span className="text-[10px] text-zinc-400 -mt-0.5">Broadcast Console</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scroll">
          {visibleNav.map((n) => {
            const Icon = n.icon
            const active = view === n.key
            return (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{n.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="border-t border-zinc-800 p-3 space-y-2">
          <div className="text-xs text-zinc-400 px-1">Connection status</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300">WhatsApp</span>
            {connectionStatus.whatsapp === 'CONNECTED'
              ? <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15">Connected</Badge>
              : <Badge variant="outline" className="text-zinc-400 border-zinc-700">Not connected</Badge>}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300">Email</span>
            {connectionStatus.email === 'CONNECTED'
              ? <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15">Connected</Badge>
              : <Badge variant="outline" className="text-zinc-400 border-zinc-700">Not connected</Badge>}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 px-5 flex items-center justify-between border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search leads, campaigns, messages…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-100 rounded-md border border-transparent focus:bg-white focus:border-zinc-300 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    setView('leads')
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
              {connectionStatus.whatsapp === 'CONNECTED' ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-zinc-400" />}
              <span className="capitalize">{connectionStatus.whatsapp.toLowerCase()}</span>
            </div>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </Button>
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-[10px] text-zinc-500 leading-tight">{user.role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-700 flex items-center justify-center text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={doLogout} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 overflow-auto custom-scroll">
          {ViewComp}
        </main>
      </div>
    </div>
  )
}
