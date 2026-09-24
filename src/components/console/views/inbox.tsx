'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Filter, Phone, MessageCircle, Mail, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'assigned_to_me', label: 'Assigned to me' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'new_leads', label: 'New leads' },
  { key: 'follow_up', label: 'Follow-up' },
]

export default function InboxView() {
  const { user, setView, setActiveConversationId, setActiveLeadId } = useConsole()
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filter !== 'all') qs.set('filter', filter)
      if (search) qs.set('search', search)
      const r = await api<{ items: any[] }>(`/api/inbox?${qs.toString()}`)
      setItems(r.items || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t) }, [search])

  function openItem(item: any) {
    setSelectedId(item.id)
    if (item.kind === 'conversation') {
      setActiveConversationId(item.id)
      setActiveLeadId(item.leadId)
      setView('whatsapp')
    } else {
      setActiveLeadId(item.leadId)
      setActiveConversationId(null)
      setView('customers')
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-full md:w-96 shrink-0 border-r border-zinc-200 flex flex-col bg-white">
        <div className="p-4 border-b border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Inbox</h1>
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading && <div className="p-6 text-center text-sm text-zinc-500">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500 space-y-1">
              <Filter className="w-8 h-8 mx-auto opacity-30" />
              <div>No conversations match this filter.</div>
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => openItem(item)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors',
                selectedId === item.id && 'bg-purple-50'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className={item.channel === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}>
                    {item.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{item.name}</span>
                    <span className="text-xs text-zinc-400 shrink-0">{formatTime(item.lastActivity)}</span>
                  </div>
                  {item.company && item.company !== item.name && (
                    <div className="text-xs text-zinc-500 truncate mb-0.5">{item.company}</div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-500 truncate">{item.lastMessage}</span>
                    {item.unreadCount > 0 && (
                      <Badge className="bg-emerald-500 text-white text-[10px] h-5 min-w-5 justify-center shrink-0">{item.unreadCount}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {item.channel === 'WHATSAPP' && (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 py-0 px-1.5">
                        <MessageCircle className="w-2.5 h-2.5 mr-0.5" /> WhatsApp
                      </Badge>
                    )}
                    {item.leadStatus && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">{item.leadStatus.replace(/_/g, ' ')}</Badge>
                    )}
                    {item.assignedTo && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-purple-700 border-purple-300">{item.assignedTo}</Badge>
                    )}
                    {item.city && (
                      <span className="text-[10px] text-zinc-400">{item.city}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Empty state for preview */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-zinc-50">
        <div className="text-center space-y-3 text-zinc-400">
          <MessageCircle className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-sm">Select a conversation to view messages</p>
          <p className="text-xs">Or use the WhatsApp tab for the full conversation workspace</p>
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
