'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Mail, Send, Inbox as InboxIcon, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

export default function EmailView() {
  const conn = useConsole((s) => s.connectionStatus)
  const [tab, setTab] = useState('inbox')
  const [inbox, setInbox] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])
  const [compose, setCompose] = useState({ to: '', subject: '', text: '' })
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [inb, sm] = await Promise.all([
        api<{ messages: any[] }>('/api/email/inbox'),
        api<{ messages: any[] }>('/api/messages?channel=EMAIL&direction=OUTBOUND'),
      ])
      setInbox(inb.messages || [])
      setSent(sm.messages || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function sendEmail() {
    if (!compose.to || !compose.subject || !compose.text) {
      toast.error('To, subject and body required')
      return
    }
    setSending(true)
    try {
      await api('/api/email/send', { method: 'POST', body: JSON.stringify(compose) })
      toast.success('Email sent')
      setCompose({ to: '', subject: '', text: '' })
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSending(false) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Mail className="w-5 h-5 text-blue-500" /> Email Console</h1>
          <p className="text-sm text-zinc-500">SMTP send + IMAP receive. Real provider, no mocks.</p>
        </div>
        {conn.email === 'CONNECTED'
          ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Connected</Badge>
          : <Badge variant="outline" className="text-zinc-500">Not connected</Badge>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inbox"><InboxIcon className="w-4 h-4 mr-1.5" /> Inbox</TabsTrigger>
          <TabsTrigger value="sent"><Send className="w-4 h-4 mr-1.5" /> Sent</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardContent className="p-0">
              {loading && <div className="p-8 text-sm text-zinc-500 text-center">Loading…</div>}
              {!loading && inbox.length === 0 && <div className="p-8 text-sm text-zinc-500 text-center">No inbound emails. Inbound messages will appear here when IMAP is configured and a worker is syncing.</div>}
              <div className="divide-y divide-zinc-100">
                {inbox.map((m) => (
                  <div key={m.id} className="p-4 hover:bg-zinc-50">
                    <div className="flex justify-between items-baseline">
                      <div className="font-medium text-sm">{m.subject || '(no subject)'}</div>
                      <span className="text-xs text-zinc-400">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">From: {m.providerId || 'unknown'}</div>
                    <div className="text-sm text-zinc-700 mt-2 line-clamp-2 whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardContent className="p-0">
              {loading && <div className="p-8 text-sm text-zinc-500 text-center">Loading…</div>}
              {!loading && sent.length === 0 && <div className="p-8 text-sm text-zinc-500 text-center">No sent emails yet.</div>}
              <div className="divide-y divide-zinc-100">
                {sent.map((m) => (
                  <div key={m.id} className="p-4 hover:bg-zinc-50">
                    <div className="flex justify-between items-baseline">
                      <div className="font-medium text-sm">{m.subject || '(no subject)'}</div>
                      <span className="text-xs text-zinc-400">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Provider: {m.providerId || '—'} · {m.status}</div>
                    <div className="text-sm text-zinc-700 mt-2 line-clamp-2 whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardContent className="p-4 space-y-3">
            {conn.email !== 'CONNECTED' && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Email NOT CONNECTED. Configure SMTP host, port, user, password, and from address in Integrations to send emails.
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="someone@example.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Message</Label>
              <Textarea rows={8} value={compose.text} onChange={(e) => setCompose({ ...compose, text: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={sendEmail} disabled={sending}><Send className="w-4 h-4 mr-1.5" /> Send</Button>
            </div>
          </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
