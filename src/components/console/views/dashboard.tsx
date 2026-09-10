'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, MessageCircle, Send, CheckCheck, Eye, AlertTriangle, Inbox, ShieldX, Megaphone, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api-client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export default function DashboardView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const r = await api<any>('/api/analytics')
      setData(r)
    } catch (e: any) {
      setErr(e?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="p-8 text-zinc-500">Loading analytics…</div>
  if (err) return <div className="p-8 text-red-500">{err}</div>
  if (!data) return null

  const t = data.totals
  const ch = data.charts

  const stats = [
    { label: 'Total Leads', value: t.totalLeads, icon: Users, color: 'text-emerald-500' },
    { label: 'Email Contacts', value: t.emailLeads, icon: Mail, color: 'text-blue-500' },
    { label: 'WhatsApp Contacts', value: t.whatsappLeads, icon: MessageCircle, color: 'text-amber-500' },
    { label: 'Eligible (Email)', value: t.eligibleEmailLeads, icon: Send, color: 'text-emerald-500' },
    { label: 'Eligible (WhatsApp)', value: t.eligibleWhatsappLeads, icon: Send, color: 'text-amber-500' },
    { label: 'Active Campaigns', value: t.activeCampaigns, icon: Megaphone, color: 'text-purple-500' },
    { label: 'Messages Sent', value: t.sentMessages, icon: Send, color: 'text-emerald-500' },
    { label: 'Delivered', value: t.deliveredMessages, icon: CheckCheck, color: 'text-emerald-500' },
    { label: 'Read', value: t.readMessages, icon: Eye, color: 'text-emerald-500' },
    { label: 'Failed', value: t.failedMessages, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Inbound', value: t.inboundMessages, icon: Inbox, color: 'text-blue-500' },
    { label: 'Unsubscribes', value: t.unsubscribes, icon: ShieldX, color: 'text-red-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500">Real-time analytics from your database. Empty databases show zero, not invented numbers.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="shadow-sm">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Messages — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ch.messagesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by City</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ch.leadsByCity} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ch.leadsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ch.leadsByStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                    {ch.leadsByStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Campaigns</CardTitle>
        </CardHeader>
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
