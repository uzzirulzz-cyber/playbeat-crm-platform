'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Inbox, ArrowUp, ArrowDown, Mail, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'

export default function MessagesView() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState('__all')
  const [direction, setDirection] = useState('__all')

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (channel !== '__all') qs.set('channel', channel)
      if (direction !== '__all') qs.set('direction', direction)
      const r = await api<{ messages: any[] }>(`/api/messages?${qs.toString()}`)
      setMessages(r.messages || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [channel, direction])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Inbox className="w-5 h-5 text-zinc-500" /> Messages</h1>
        <p className="text-sm text-zinc-500">Unified history of every outbound and inbound message across channels.</p>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex gap-3 items-center">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All channels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All channels</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All directions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All directions</SelectItem>
                <SelectItem value="OUTBOUND">Outbound</SelectItem>
                <SelectItem value="INBOUND">Inbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Direction</th>
                <th className="text-left font-medium px-3 py-2.5">Channel</th>
                <th className="text-left font-medium px-3 py-2.5">Subject / Preview</th>
                <th className="text-left font-medium px-3 py-2.5">Provider ID</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && messages.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">No messages.</td></tr>}
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5">
                    {m.direction === 'OUTBOUND'
                      ? <div className="flex items-center gap-1 text-emerald-600"><ArrowUp className="w-3.5 h-3.5" /> Out</div>
                      : <div className="flex items-center gap-1 text-blue-600"><ArrowDown className="w-3.5 h-3.5" /> In</div>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    {m.channel === 'EMAIL'
                      ? <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-500" /> Email</div>
                      : <div className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp</div>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{m.subject || '(no subject)'}</div>
                    <div className="text-xs text-zinc-500 truncate max-w-md">{m.body}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500">{m.providerId || '—'}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{m.status}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(m.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
