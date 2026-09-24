'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { IdCard, Phone, MessageCircle, CheckSquare, CalendarClock, Users, TrendingUp, Clock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { cn } from '@/lib/utils'

const AVAILABILITY_COLORS: Record<string, string> = {
  ONLINE: 'bg-emerald-400',
  AWAY: 'bg-amber-400',
  BUSY: 'bg-red-400',
  OFFLINE: 'bg-zinc-400',
}

export default function EmployeesView() {
  const { user, setView } = useConsole()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ employees: any[] }>('/api/employees')
      setEmployees(r.employees || [])
    } catch (e: any) {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { const t = setInterval(load, 10000); return () => clearInterval(t) }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><IdCard className="w-5 h-5 text-purple-600" /> Employees</h1>
        <p className="text-sm text-zinc-500">Real-time availability and per-employee communication stats.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={Users} label="Total employees" value={employees.length} color="text-purple-600" />
        <SummaryCard icon={Circle} label="Online now" value={employees.filter((e) => e.availability === 'ONLINE').length} color="text-emerald-600" />
        <SummaryCard icon={Phone} label="Calls today" value={employees.reduce((sum, e) => sum + e.stats.callsMade, 0)} color="text-blue-600" />
        <SummaryCard icon={CheckSquare} label="Active tasks" value={employees.reduce((sum, e) => sum + e.stats.activeTasks, 0)} color="text-amber-600" />
      </div>

      {/* Employee cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && <div className="col-span-full text-center py-8 text-zinc-500">Loading…</div>}
        {!loading && employees.length === 0 && (
          <Card><CardContent className="p-8 text-center text-zinc-500">
            <IdCard className="w-10 h-10 mx-auto opacity-30 mb-2" />
            No employees found. Add users in the Users page.
          </CardContent></Card>
        )}
        {employees.map((e) => (
          <Card key={e.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="pb-gradient-purple text-white">{e.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white', AVAILABILITY_COLORS[e.availability])} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{e.name}</div>
                  <div className="text-xs text-zinc-500 truncate">{e.title || e.role.replace(/_/g, ' ').toLowerCase()}</div>
                  <div className="text-xs text-zinc-400 truncate">{e.email}</div>
                </div>
                <Badge variant="outline" className={cn('text-[10px]', e.availability === 'ONLINE' ? 'text-emerald-700 border-emerald-300' : 'text-zinc-500')}>
                  {e.availability.toLowerCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Calls made" value={e.stats.callsMade} />
                <Stat label="Calls answered" value={e.stats.callsAnswered} />
                <Stat label="Messages sent" value={e.stats.messagesSent} />
                <Stat label="Leads contacted" value={e.stats.leadsContacted} />
                <Stat label="Follow-ups" value={e.stats.followupsScheduled} />
                <Stat label="Completed" value={e.stats.followupsCompleted} />
                <Stat label="Active tasks" value={e.stats.activeTasks} />
                <Stat label="Conversion rate" value={e.stats.leadsContacted > 0 ? `${Math.round((e.stats.followupsCompleted / e.stats.leadsContacted) * 100)}%` : '0%'} />
              </div>

              {e.lastLogin && (
                <div className="text-[10px] text-zinc-400 mt-3 pt-3 border-t border-zinc-100">
                  Last login: {new Date(e.lastLogin).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">{label}</span>
          <Icon className={cn('w-3.5 h-3.5', color)} />
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-zinc-50 rounded px-2 py-1">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  )
}

// tiny circle for icon
function Circle(props: any) {
  return <span className="inline-block w-3.5 h-3.5 rounded-full bg-emerald-500" {...props} />
}
