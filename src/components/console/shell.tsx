'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, Inbox, MessageCircle, PhoneCall, Phone, Users, UserCircle2,
  CheckSquare, CalendarClock, FileText, Megaphone, BarChart3, IdCard,
  FolderTree, ShieldX, Plug, UserCog, History, Settings as SettingsIcon,
  Search, Bell, LogOut, Send, ChevronLeft, ChevronRight, Wifi, WifiOff,
  MoreHorizontal, CircleDot, Menu, X
} from 'lucide-react'
import { useConsole, type ViewKey, hasMinRole } from '@/lib/console-store'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import DashboardView from '@/components/console/views/dashboard'
import InboxView from '@/components/console/views/inbox'
import WhatsAppView from '@/components/console/views/whatsapp'
import CallsView from '@/components/console/views/calls'
import DialerView from '@/components/console/views/dialer'
import LeadsView from '@/components/console/views/leads'
import CustomersView from '@/components/console/views/customers'
import TasksView from '@/components/console/views/tasks'
import FollowupsView from '@/components/console/views/followups'
import TemplatesView from '@/components/console/views/templates'
import CampaignsView from '@/components/console/views/campaigns'
import ReportsView from '@/components/console/views/reports'
import EmployeesView from '@/components/console/views/employees'
import SegmentsView from '@/components/console/views/segments'
import MessagesView from '@/components/console/views/messages'
import AnalyticsView from '@/components/console/views/analytics'
import SuppressionView from '@/components/console/views/suppression'
import IntegrationsView from '@/components/console/views/integrations'
import UsersView from '@/components/console/views/users'
import AuditLogsView from '@/components/console/views/audit-logs'
import SettingsView from '@/components/console/views/settings'
import { toast } from 'sonner'

interface NavItem {
  key: ViewKey
  label: string
  icon: any
  minRole?: string
  group?: 'main' | 'crm' | 'system'
}

const NAV: NavItem[] = [
  // Main communication
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { key: 'inbox', label: 'Inbox', icon: Inbox, group: 'main' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, group: 'main' },
  { key: 'calls', label: 'Calls', icon: PhoneCall, group: 'main' },
  { key: 'dialer', label: 'Dialer', icon: Phone, group: 'main' },
  // CRM
  { key: 'leads', label: 'Leads', icon: Users, group: 'crm' },
  { key: 'customers', label: 'Customers', icon: UserCircle2, group: 'crm' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, group: 'crm' },
  { key: 'followups', label: 'Follow-ups', icon: CalendarClock, group: 'crm' },
  { key: 'templates', label: 'Templates', icon: FileText, group: 'crm' },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone, group: 'crm' },
  { key: 'reports', label: 'Reports', icon: BarChart3, group: 'crm' },
  { key: 'employees', label: 'Employees', icon: IdCard, minRole: 'MANAGER', group: 'crm' },
  // System
  { key: 'segments', label: 'Segments', icon: FolderTree, group: 'system' },
  { key: 'messages', label: 'Messages', icon: Inbox, group: 'system' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, group: 'system' },
  { key: 'suppression', label: 'Suppression', icon: ShieldX, group: 'system' },
  { key: 'integrations', label: 'Integrations', icon: Plug, minRole: 'ADMIN', group: 'system' },
  { key: 'users', label: 'Users', icon: UserCog, minRole: 'ADMIN', group: 'system' },
  { key: 'audit-logs', label: 'Audit Logs', icon: History, minRole: 'ADMIN', group: 'system' },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, minRole: 'ADMIN', group: 'system' },
]

const MOBILE_NAV: ViewKey[] = ['inbox', 'calls', 'dialer', 'leads', 'dashboard']

export default function ConsoleShell() {
  const { user, view, setView, setUser, connectionStatus, setConnectionStatus, availability, setAvailability, logout } = useConsole()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [search, setSearch] = useState('')

  // Verify session + poll connection status
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
          const mc = integrations.integrations.find((i) => i.provider === 'META_CAPI')
          const tp = integrations.integrations.find((i) => i.provider === 'TELEPHONY')
          setConnectionStatus({
            whatsapp: wa?.status || 'DISCONNECTED',
            email: em?.status || 'DISCONNECTED',
            metaCapi: mc?.status || 'DISCONNECTED',
            telephony: tp?.status || 'DISCONNECTED',
          })
        }
      } catch {}
    })()
    const t = setInterval(async () => {
      try {
        const integrations = await api<{ integrations: any[] }>('/api/integrations')
        const wa = integrations.integrations.find((i) => i.provider === 'WHATSAPP')
        const em = integrations.integrations.find((i) => i.provider === 'EMAIL')
        const mc = integrations.integrations.find((i) => i.provider === 'META_CAPI')
        const tp = integrations.integrations.find((i) => i.provider === 'TELEPHONY')
        setConnectionStatus({
          whatsapp: wa?.status || 'DISCONNECTED',
          email: em?.status || 'DISCONNECTED',
          metaCapi: mc?.status || 'DISCONNECTED',
          telephony: tp?.status || 'DISCONNECTED',
        })
      } catch {}
      // Refresh notifications
      try {
        const r = await api<{ notifications: any[]; unreadCount: number }>('/api/notifications')
        setNotifications(r.notifications || [])
        setUnreadNotifs(r.unreadCount || 0)
      } catch {}
    }, 15000)
    return () => { mounted = false; clearInterval(t) }
  }, [setUser, setConnectionStatus])

  // Refresh notifications on view change
  useEffect(() => {
    api<{ notifications: any[]; unreadCount: number }>('/api/notifications').then((r) => {
      setNotifications(r.notifications || [])
      setUnreadNotifs(r.unreadCount || 0)
    }).catch(() => {})
  }, [view])

  const visibleNav = useMemo(() => {
    if (!user) return []
    return NAV.filter((n) => !n.minRole || hasMinRole(user, n.minRole))
  }, [user])

  async function doLogout() {
    try { await api('/api/auth/login', { method: 'DELETE' }) } catch {}
    logout()
    setUser(null)
  }

  async function markAllRead() {
    try {
      await api('/api/notifications/mark-read', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadNotifs(0)
    } catch {}
  }

  async function setMyAvailability(a: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE') {
    setAvailability(a)
    toast.success(`Availability set to ${a.toLowerCase()}`)
    // In production: also POST to /api/me/availability to persist
  }

  if (!user) return null

  const groupedNav = {
    main: visibleNav.filter((n) => n.group === 'main'),
    crm: visibleNav.filter((n) => n.group === 'crm'),
    system: visibleNav.filter((n) => n.group === 'system'),
  }

  const ViewComp = (() => {
    switch (view) {
      case 'dashboard': return <DashboardView />
      case 'inbox': return <InboxView />
      case 'whatsapp': return <WhatsAppView />
      case 'calls': return <CallsView />
      case 'dialer': return <DialerView />
      case 'leads': return <LeadsView />
      case 'customers': return <CustomersView />
      case 'tasks': return <TasksView />
      case 'followups': return <FollowupsView />
      case 'templates': return <TemplatesView />
      case 'campaigns': return <CampaignsView />
      case 'reports': return <ReportsView />
      case 'employees': return <EmployeesView />
      case 'segments': return <SegmentsView />
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

  const availColor = {
    ONLINE: 'bg-emerald-400',
    AWAY: 'bg-amber-400',
    BUSY: 'bg-red-400',
    OFFLINE: 'bg-zinc-500',
  }[availability]

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-900">
      {/* Sidebar (desktop) */}
      <aside
        className={cn(
          'hidden md:flex flex-col pb-gradient-charcoal text-zinc-200 border-r border-purple-900/30 transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-purple-900/30">
          <div className="w-8 h-8 rounded-lg pb-gradient-purple flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white">PlayBeat CRM</span>
              <span className="text-[10px] text-purple-300/80 -mt-0.5">Communication Center</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scroll">
          <NavGroup items={groupedNav.main} label="Communication" collapsed={collapsed} view={view} setView={setView} />
          <NavGroup items={groupedNav.crm} label="CRM" collapsed={collapsed} view={view} setView={setView} />
          <NavGroup items={groupedNav.system} label="System" collapsed={collapsed} view={view} setView={setView} />
        </nav>

        {/* Connection status */}
        {!collapsed && (
          <div className="border-t border-purple-900/30 p-3 space-y-1.5 text-xs">
            <div className="text-[10px] text-purple-300/60 uppercase tracking-wide mb-1">Connection</div>
            <StatusRow label="WhatsApp" status={connectionStatus.whatsapp} />
            <StatusRow label="Email" status={connectionStatus.email} />
            <StatusRow label="Telephony" status={connectionStatus.telephony} />
            <StatusRow label="Meta CAPI" status={connectionStatus.metaCapi} />
          </div>
        )}

        {/* Employee profile */}
        <div className="border-t border-purple-900/30 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn('w-full flex items-center gap-2 p-2 rounded-md hover:bg-purple-900/20 transition-colors', collapsed && 'justify-center')}>
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full pb-gradient-purple flex items-center justify-center text-xs font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-zinc-900', availColor)} />
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-purple-300/70 truncate">{user.role.replace(/_/g, ' ').toLowerCase()}</div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-zinc-500 font-normal">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-zinc-500">Availability</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setMyAvailability('ONLINE')}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" /> Online
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMyAvailability('AWAY')}>
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-2" /> Away
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMyAvailability('BUSY')}>
                <span className="w-2 h-2 rounded-full bg-red-400 mr-2" /> Busy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMyAvailability('OFFLINE')}>
                <span className="w-2 h-2 rounded-full bg-zinc-500 mr-2" /> Offline
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('settings')}>
                <SettingsIcon className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-64 pb-gradient-charcoal text-zinc-200 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-purple-900/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg pb-gradient-purple flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">PlayBeat CRM</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setMobileNavOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scroll">
              <NavGroup items={groupedNav.main} label="Communication" collapsed={false} view={view} setView={(v) => { setView(v); setMobileNavOpen(false) }} />
              <NavGroup items={groupedNav.crm} label="CRM" collapsed={false} view={view} setView={(v) => { setView(v); setMobileNavOpen(false) }} />
              <NavGroup items={groupedNav.system} label="System" collapsed={false} view={view} setView={(v) => { setView(v); setMobileNavOpen(false) }} />
            </nav>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers, leads, phone numbers…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-100 rounded-md border border-transparent focus:bg-white focus:border-purple-300 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search) setView('leads')
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="w-4 h-4" />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-medium">Notifications</span>
                  {unreadNotifs > 0 && (
                    <button onClick={markAllRead} className="text-xs text-purple-600 hover:underline">Mark all read</button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto custom-scroll">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500">No notifications</div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div key={n.id} className={cn('px-3 py-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50', !n.read && 'bg-purple-50/50')}>
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{n.title}</div>
                            {n.body && <div className="text-xs text-zinc-600 line-clamp-2">{n.body}</div>}
                            <div className="text-[10px] text-zinc-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User profile (mobile shows in dropdown) */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium leading-tight">{user.name}</div>
                <div className="text-[10px] text-zinc-500 leading-tight capitalize">{user.role.replace(/_/g, ' ').toLowerCase()}</div>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-full pb-gradient-purple flex items-center justify-center text-xs font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white', availColor)} />
              </div>
            </div>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 overflow-auto custom-scroll">
          {ViewComp}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-center justify-around border-t border-zinc-200 bg-white px-1 py-1">
          {MOBILE_NAV.map((v) => {
            const item = NAV.find((n) => n.key === v)
            if (!item) return null
            const Icon = item.icon
            const active = view === v
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md', active ? 'text-purple-600' : 'text-zinc-500')}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-500"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px]">More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

function NavGroup({ items, label, collapsed, view, setView }: {
  items: NavItem[]
  label: string
  collapsed: boolean
  view: ViewKey
  setView: (v: ViewKey) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-3">
      {!collapsed && (
        <div className="text-[10px] text-purple-300/50 uppercase tracking-wider px-3 py-1.5 font-medium">{label}</div>
      )}
      {items.map((n) => {
        const Icon = n.icon
        const active = view === n.key
        return (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            title={collapsed ? n.label : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              active
                ? 'bg-purple-600/30 text-white ring-1 ring-purple-500/40'
                : 'text-zinc-300 hover:bg-purple-900/20 hover:text-white',
              collapsed && 'justify-center'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{n.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

function StatusRow({ label, status }: { label: string; status: 'CONNECTED' | 'DISCONNECTED' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-300">{label}</span>
      {status === 'CONNECTED'
        ? <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15 text-[10px] px-1.5 py-0">On</Badge>
        : <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[10px] px-1.5 py-0">Off</Badge>}
    </div>
  )
}
