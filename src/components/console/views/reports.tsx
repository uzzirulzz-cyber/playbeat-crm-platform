'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Phone, MessageCircle, Calendar, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api-client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { useConsole } from '@/lib/console-store'

const PIE_COLORS = ['#6d28d9', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899']

export default function ReportsView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<any>('/api/analytics').then((r) => setData(r)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-zinc-500">Loading reports…</div>
  if (!data) return null

  const t = data.totals
  const ch = data.charts

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600" /> Reports</h1>
        <p className="text-sm text-zinc-500">Communication analytics. All numbers come from real database records — no fabricated stats.</p>
      </div>

      {/* Communication summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Metric icon={Phone} color="text-purple-600" label="Calls Today" value={t.callsToday} />
        <Metric icon={MessageCircle} color="text-emerald-600" label="Messages Today" value={t.messagesToday} />
        <Metric icon={AlertCircle} color="text-red-600" label="Missed Calls" value={t.missedCalls} />
        <Metric icon={Users} color="text-blue-600" label="New Leads Today" value={t.newLeadsToday} />
        <Metric icon={Calendar} color="text-amber-600" label="Follow-ups Due" value={t.followupsDueToday} />
        <Metric icon={Users} color="text-cyan-600" label="Active Employees" value={t.activeEmployees} />
      </div>

      {/* Detailed totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric icon={Phone} color="text-purple-600" label="Total Calls" value={t.totalCalls} />
        <Metric icon={CheckCircle} color="text-emerald-600" label="Calls Completed" value={t.totalCallsCompleted} />
        <Metric icon={Clock} color="text-blue-600" label="Total Call Time" value={formatHours(t.totalCallDurationSec)} />
        <Metric icon={MessageCircle} color="text-purple-600" label="Active Conversations" value={t.activeConversations} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-600" /> Communication Activity — 7 days</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Calls by Outcome</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              {ch.callsByOutcome.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">No calls yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ch.callsByOutcome} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                      {ch.callsByOutcome.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Calls by Direction</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              {ch.callsByDirection.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">No calls yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ch.callsByDirection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
    </div>
  )
}

function Metric({ icon: Icon, color, label, value }: any) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">{label}</span>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function formatHours(sec: number): string {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
