'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall, MoreVertical, RotateCw } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function CallsView() {
  const { setView, setActiveLeadId } = useConsole()
  const [calls, setCalls] = useState<any[]>([])
  const [counts, setCounts] = useState<any>({ all: 0, incoming: 0, outgoing: 0, missed: 0, voicemail: 0 })
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (tab === 'incoming') qs.set('direction', 'INBOUND')
      else if (tab === 'outgoing') qs.set('direction', 'OUTBOUND')
      else if (tab === 'missed') qs.set('status', 'MISSED')
      else if (tab === 'voicemail') qs.set('status', 'VOICEMAIL')
      const r = await api<{ calls: any[]; counts: any }>(`/api/calls/history?${qs.toString()}`)
      setCalls(r.calls || [])
      setCounts(r.counts || {})
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab])
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t) }, [tab])

  function callAgain(phone: string) {
    if (!phone) return
    // Use the dialer view to call again
    setView('dialer')
    toast.info(`Number loaded in dialer: ${phone}`)
  }

  function openCustomer(leadId: string) {
    if (!leadId) return
    setActiveLeadId(leadId)
    setView('customers')
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><PhoneCall className="w-5 h-5 text-purple-600" /> Calls</h1>
        <p className="text-sm text-zinc-500">Call history across all employees. Real call records from the telephony provider.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="incoming">Incoming ({counts.incoming})</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing ({counts.outgoing})</TabsTrigger>
          <TabsTrigger value="missed">Missed ({counts.missed})</TabsTrigger>
          <TabsTrigger value="voicemail">Voicemail ({counts.voicemail})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Direction</th>
                <th className="text-left font-medium px-3 py-2.5">Customer</th>
                <th className="text-left font-medium px-3 py-2.5">Phone</th>
                <th className="text-left font-medium px-3 py-2.5">Employee</th>
                <th className="text-left font-medium px-3 py-2.5">Duration</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Outcome</th>
                <th className="text-left font-medium px-3 py-2.5">Time</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={9} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && calls.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-zinc-500">
                  <Phone className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  No calls found. {tab === 'all' && 'Initiate a call from the Dialer to see it here.'}
                </td></tr>
              )}
              {calls.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5">
                    {c.direction === 'INBOUND' ? (
                      <div className="flex items-center gap-1.5 text-blue-600"><PhoneIncoming className="w-3.5 h-3.5" /> In</div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-purple-600"><PhoneOutgoing className="w-3.5 h-3.5" /> Out</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => openCustomer(c.leadId)} className={cn('font-medium', c.leadId && 'hover:underline text-purple-700')}>
                      {c.leadName || 'Unknown'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{c.phone}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{c.employeeName || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums font-mono text-xs">{formatDuration(c.durationSec || 0)}</td>
                  <td className="px-3 py-2.5"><CallStatusBadge status={c.status} /></td>
                  <td className="px-3 py-2.5">{c.outcome ? <Badge variant="outline" className="text-xs">{c.outcome.replace(/_/g, ' ').toLowerCase()}</Badge> : <span className="text-zinc-400 text-xs">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(c.startedAt).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => callAgain(c.phone)} title="Call again">
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function CallStatusBadge({ status }: { status: string }) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    INITIATING: 'secondary',
    RINGING: 'secondary',
    CONNECTED: 'default',
    ON_HOLD: 'secondary',
    ENDED: 'outline',
    FAILED: 'destructive',
    MISSED: 'destructive',
    DECLINED: 'outline',
    BUSY: 'destructive',
    NO_ANSWER: 'destructive',
  }
  return <Badge variant={map[status] || 'outline'} className="text-xs">{status.replace(/_/g, ' ').toLowerCase()}</Badge>
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
