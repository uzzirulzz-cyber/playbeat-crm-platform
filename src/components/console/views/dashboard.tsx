'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Mail, MessageCircle, Send, CheckCheck, Eye, AlertTriangle, Inbox, ShieldX, Megaphone,
  Phone, PhoneCall, Calendar, TrendingUp, BarChart3, UserCheck, Clock
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

const PIE_COLORS = ['#6d28d9', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#3b82f6']

export default function DashboardView() {
  const { setView } = useConsole()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true); setErr('')
    try {
      const r = await api<any>('/api/analytics')
      setData(r)
    } catch (e: any) { setErr(e?.message || 'Failed to load analytics') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="p-8 text-zinc-500">Loading dashboard…</div>
  if (err) return <div className="p-8 text-red-500">{err}</div>
  if (!data) return null

  const t = data.totals
  const ch = data.charts

  const commStats = [
    { label: 'Calls Today', value: t.callsToday, icon: PhoneCall, color: 'text-purple-600', view: 'calls' as const },
    { label: 'Messages Today', value: t.messagesToday, icon: MessageCircle, color: 'text-emerald-600', view: 'whatsapp' as const },
    { label: 'Active Conversations', value: t.activeConversations, icon: Inbox, color: 'text-blue-600', view: 'inbox' as const },
    { label: 'Missed Calls', value: t.missedCalls, icon: AlertTriangle, color: 'text-red-600', view: 'calls' as const },
    { label: 'New Leads Today', value: t.newLeadsToday, icon: UserCheck, color: 'text-purple-600', view: 'leads' as const },
    { label: 'Follow-ups Due', value: t.followupsDueToday, icon: Calendar, color: 'text-amber-600', view: 'followups' as const },
  ]

  const leadStats = [
    { label: 'Total Leads', value: t.totalLeads, icon: Users, color: 'text-purple-600' },
    { label: 'Email Contacts', value: t.emailLeads, icon: Mail, color: 'text-blue-500' },
    { label: 'WhatsApp Contacts', value: t.whatsappLeads, icon: MessageCircle, color: 'text-emerald-600' },
    { label: 'Eligible (Email)', value: t.eligibleEmailLeads, icon: Send, color: 'text-blue-500' },
    { label: 'Eligible (WA)', value: t.eligibleWhatsappLeads, icon: Send, color: 'text-emerald-600' },
    { label: 'Active Campaigns', value: t.activeCampaigns, icon: Megaphone, color: 'text-purple-600' },
    { label: 'Messages Sent', value: t.sentMessages, icon: Send, color: 'text-purple-600' },
    { label: 'Delivered', value: t.deliveredMessages, icon: CheckCheck, color: 'text-emerald-600' },
    { label: 'Read', value: t.readMessages, icon: Eye, color: 'text-emerald-600' },
    { label: 'Failed', value: t.failedMessages, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Inbound', value: t.inboundMessages, icon: Inbox, color: 'text-blue-600' },
    { label: 'Unsubscribes', value: t.unsubscribes, icon: ShieldX, color: 'text-red-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">One workspace. Every customer conversation. Real-time analytics — no fabricated stats.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView('dialer')}>
            <Phone className="w-4 h-4 mr-1.5" /> Dialer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView('reports')}>
            <BarChart3 className="w-4 h-4 mr-1.5" /> Full Reports
          </Button>
        </div>
      </div>

      {/* Communication stats */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Communication Today</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {commStats.map((s) => {
            const Icon = s.icon
            return (
              <button key={s.label} onClick={() => setView(s.view)} className="text-left">
                <Card className="hover:shadow-md hover:border-purple-300 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-500">{s.label}</span>
                      <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lead stats */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">CRM & Campaigns</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {leadStats.map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500">{s.label}</span>
                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-600" /> Communication — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ch.messagesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="messages" fill="#6d28d9" radius={[4, 4, 0, 0]} name="Messages" />
                  <Bar dataKey="calls" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Calls" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Leads by City</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ch.leadsByCity} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6d28d9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ch.leadsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lead Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ch.leadsByStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                    {ch.leadsByStatus.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent campaigns */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Campaigns</CardTitle></CardHeader>
        <CardContent>
          {data.campaigns.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6 text-center">No campaigns yet.</div>
          ) : (
            <div className="space-y-2">
              {data.campaigns.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-md border border-zinc-200 bg-zinc-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <Badge variant="outline" className="text-xs">{c.channel}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    <span>Total: {c.stats.total || 0}</span>
                    <span className="text-emerald-600">Sent: {c.stats.sent || 0}</span>
                    <span className="text-red-600">Failed: {c.stats.failed || 0}</span>
                    <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
