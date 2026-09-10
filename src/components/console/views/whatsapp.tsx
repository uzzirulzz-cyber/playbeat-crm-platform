'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Search, MessageCircle, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'
import { io } from 'socket.io-client'

export default function WhatsAppView() {
  const conn = useConsole((s) => s.connectionStatus)
  const [conversations, setConversations] = useState<any[]>([])
  const [active, setActive] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const socketRef = useRef<any>(null)

  async function loadConversations() {
    setLoading(true)
    try {
      const r = await api<{ conversations: any[] }>('/api/conversations')
      // Filter WhatsApp only
      setConversations((r.conversations || []).filter((c) => c.channel === 'WHATSAPP'))
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  async function openConversation(c: any) {
    setActive(c)
    try {
      const r = await api<{ conversation: any; messages: any[] }>(`/api/conversations/${c.id}`)
      setMessages(r.messages || [])
    } catch (e: any) { toast.error(e.message) }
  }

  async function send() {
    if (!active || !draft.trim()) return
    setSending(true)
    try {
      await api(`/api/conversations/${active.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft }),
      })
      setDraft('')
      // Refresh messages
      const r = await api<{ messages: any[] }>(`/api/conversations/${active.id}`)
      setMessages(r.messages || [])
      loadConversations()
    } catch (e: any) {
      toast.error(e.message)
    } finally { setSending(false) }
  }

  useEffect(() => {
    loadConversations()
    // Connect to socket.io for real-time updates
    try {
      const sock = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'] })
      sock.on('connect', () => { /* connected */ })
      sock.on('conversation:new', () => loadConversations())
      sock.on('message:received', (data: any) => {
        if (active && data?.conversationId === active.id) {
          setMessages((m) => [...m, data])
        }
        loadConversations()
      })
      sock.on('message:sent', (data: any) => {
        if (active && data?.conversationId === active.id) {
          setMessages((m) => [...m, data])
        }
      })
      sock.on('message:delivered', () => loadConversations())
      sock.on('message:failed', () => loadConversations())
      socketRef.current = sock
    } catch (e) { /* dev environment may not have socket server */ }
    return () => { try { socketRef.current?.disconnect() } catch {} }
  }, [active?.id])

  const filtered = conversations.filter((c) =>
    !search || (c.leadName || '').toLowerCase().includes(search.toLowerCase()) || (c.leadPhone || '').includes(search)
  )

  return (
    <div className="flex h-full bg-white">
      {/* Left - conversation list */}
      <div className={`w-full md:w-80 shrink-0 border-r border-zinc-200 flex flex-col ${active ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp</h2>
              <p className="text-xs text-zinc-500">Official Cloud API · real-time</p>
            </div>
            {conn.whatsapp === 'CONNECTED'
              ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Connected</Badge>
              : <Badge variant="outline" className="text-zinc-500">Not connected</Badge>}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll">
          {loading && <div className="p-6 text-sm text-zinc-500 text-center">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-sm text-zinc-500 text-center">
              No conversations yet.
              <div className="mt-2 text-xs text-zinc-400">Incoming WhatsApp messages from your webhook will appear here.</div>
            </div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${active?.id === c.id ? 'bg-emerald-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {(c.leadName || c.leadPhone || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{c.leadName || c.leadPhone}</span>
                    {c.lastMessageAt && <span className="text-xs text-zinc-400 shrink-0">{new Date(c.lastMessageAt).toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500 truncate">{c.lastMessage || '—'}</span>
                    {c.unreadCount > 0 && <Badge className="bg-emerald-500 text-white text-[10px] h-5 min-w-5 justify-center">{c.unreadCount}</Badge>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center + Right - conversation view */}
      <div className={`flex-1 flex flex-col min-w-0 ${active ? 'flex' : 'hidden md:flex'}`}>
        {active ? (
          <>
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setActive(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                  {(active.leadName || active.leadPhone || '?').charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-sm">{active.leadName || active.leadPhone}</div>
                  <div className="text-xs text-zinc-500">{active.leadPhone}</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">{active.status}</Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2 bg-zinc-50">
              {messages.length === 0 && <div className="text-sm text-zinc-500 text-center py-8">No messages yet.</div>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${m.direction === 'OUTBOUND' ? 'bg-emerald-500 text-white' : 'bg-white border border-zinc-200'}`}>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className={`text-[10px] mt-0.5 ${m.direction === 'OUTBOUND' ? 'text-emerald-100' : 'text-zinc-400'}`}>
                      {new Date(m.createdAt).toLocaleTimeString()} · {m.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-zinc-200 p-3 bg-white">
              {conn.whatsapp !== 'CONNECTED' && (
                <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  WhatsApp NOT CONNECTED. Configure Business Account ID, Phone Number ID, and Access Token in Integrations to send messages.
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  rows={1}
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                />
                <Button onClick={send} disabled={sending || !draft.trim()} size="icon" className="bg-emerald-500 hover:bg-emerald-400">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400">
            <div className="text-center space-y-1">
              <MessageCircle className="w-12 h-12 mx-auto opacity-50" />
              <p>Select a conversation to view messages.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
