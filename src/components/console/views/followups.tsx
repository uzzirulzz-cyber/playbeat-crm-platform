'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, Plus, Phone, MessageCircle, Mail, Calendar, CheckCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function FollowupsView() {
  const { setActiveLeadId, setView } = useConsole()
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'all'>('upcoming')

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (tab === 'upcoming') qs.set('upcoming', 'true')
      else if (tab === 'overdue') qs.set('status', 'OVERDUE')
      const r = await api<{ followups: any[] }>(`/api/followups?${qs.toString()}`)
      // For overdue tab, the API returns all and we filter
      let list = r.followups || []
      if (tab === 'overdue') {
        list = list.filter((f) => f.status === 'SCHEDULED' && new Date(f.scheduledAt).getTime() < Date.now())
      } else if (tab === 'upcoming') {
        list = list.filter((f) => f.status === 'SCHEDULED')
      }
      setFollowups(list)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab])

  async function markComplete(id: string) {
    try {
      await api(`/api/followups/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'COMPLETED' }) })
      toast.success('Marked as complete')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function cancelFollowup(id: string) {
    if (!confirm('Cancel this follow-up?')) return
    try {
      await api(`/api/followups/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'CANCELLED' }) })
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  function openLead(leadId: string) {
    setActiveLeadId(leadId)
    setView('customers')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><CalendarClock className="w-5 h-5 text-purple-600" /> Follow-ups</h1>
          <p className="text-sm text-zinc-500">Scheduled contact attempts across leads.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['upcoming', 'overdue', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
              tab === t ? 'bg-purple-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center py-8 text-zinc-500">Loading…</div>}
        {!loading && followups.length === 0 && (
          <Card><CardContent className="p-8 text-center text-zinc-500">
            <CalendarClock className="w-10 h-10 mx-auto opacity-30 mb-2" />
            No follow-ups scheduled. Schedule one from a call outcome or lead profile.
          </CardContent></Card>
        )}
        {followups.map((f) => {
          const isOverdue = new Date(f.scheduledAt).getTime() < Date.now() && f.status === 'SCHEDULED'
          return (
            <Card key={f.id} className={cn(isOverdue && 'border-red-300 bg-red-50/50')}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isOverdue ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600')}>
                  {isOverdue ? <Clock className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openLead(f.leadId)} className="font-medium text-sm text-purple-700 hover:underline">{f.leadName || 'Unknown lead'}</button>
                    <Badge variant="outline" className="text-[10px]">{f.channel}</Badge>
                    {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Scheduled: {new Date(f.scheduledAt).toLocaleString()} • {f.employeeName || '—'}
                  </div>
                  {f.notes && <div className="text-xs text-zinc-600 mt-1 line-clamp-1">{f.notes}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {f.status === 'SCHEDULED' && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => markComplete(f.id)} title="Mark complete">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelFollowup(f.id)} title="Cancel">
                        <CalendarClock className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
