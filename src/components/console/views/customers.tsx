'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Phone, MessageCircle, Mail, Calendar, FileText, StickyNote, Edit, Plus, Tag, MapPin, Globe, Briefcase, CheckSquare, CalendarClock, Users } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Button as Btn } from '@/components/ui/button'

export default function CustomersView() {
  const { activeLeadId, setActiveLeadId, setView, connectionStatus } = useConsole()
  const [lead, setLead] = useState<any | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [followups, setFollowups] = useState<any[]>([])
  const [tab, setTab] = useState<'timeline' | 'notes' | 'tasks' | 'followups'>('timeline')
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!activeLeadId) { setLoading(false); return }
    setLoading(true)
    try {
      const [leadR, timelineR, notesR, tasksR, followupsR] = await Promise.all([
        api<{ lead: any }>(`/api/leads/${activeLeadId}`),
        api<{ timeline: any[] }>(`/api/timeline/${activeLeadId}`),
        api<{ notes: any[] }>(`/api/notes?leadId=${activeLeadId}`),
        api<{ tasks: any[] }>(`/api/tasks?leadId=${activeLeadId}`),
        api<{ followups: any[] }>(`/api/followups?leadId=${activeLeadId}`),
      ])
      setLead(leadR.lead)
      setTimeline(timelineR.timeline || [])
      setNotes(notesR.notes || [])
      setTasks(tasksR.tasks || [])
      setFollowups(followupsR.followups || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeLeadId])

  async function addNote() {
    if (!newNote.trim() || !activeLeadId) return
    try {
      await api('/api/notes', { method: 'POST', body: JSON.stringify({ leadId: activeLeadId, body: newNote }) })
      setNewNote('')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteNote(id: string) {
    try { await api(`/api/notes/${id}`, { method: 'DELETE' }); load() } catch (e: any) { toast.error(e.message) }
  }

  if (!activeLeadId || !lead) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3 text-zinc-400">
          <MessageCircle className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-sm">Select a customer to view their profile, timeline, and CRM history.</p>
          <Button variant="outline" size="sm" onClick={() => setView('inbox')}>Open Inbox</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left: customer info */}
      <div className="w-full lg:w-80 shrink-0 border-r border-zinc-200 bg-white overflow-y-auto custom-scroll">
        <div className="p-5 space-y-4">
          <div className="text-center space-y-2">
            <Avatar className="w-20 h-20 mx-auto">
              <AvatarFallback className="pb-gradient-purple text-white text-2xl">{(lead.businessName || '?').charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{lead.businessName}</h2>
              {lead.contactPerson && <p className="text-sm text-zinc-500">{lead.contactPerson}</p>}
            </div>
            <div className="flex justify-center gap-1.5">
              <Badge variant="outline" className="text-xs">{lead.status.replace(/_/g, ' ').toLowerCase()}</Badge>
              <Badge variant="outline" className="text-xs">Score: {lead.score}</Badge>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="flex flex-col items-center py-2" disabled={connectionStatus.telephony !== 'CONNECTED'} onClick={() => setView('dialer')}>
              <Phone className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Call</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center py-2" onClick={() => setView('whatsapp')}>
              <MessageCircle className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">WhatsApp</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center py-2" disabled={connectionStatus.email !== 'CONNECTED'} onClick={() => setView('whatsapp')}>
              <Mail className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Email</span>
            </Button>
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm">
            {lead.whatsapp && <InfoRow icon={Phone} label="Phone" value={lead.whatsapp} />}
            {lead.email && <InfoRow icon={Mail} label="Email" value={lead.email} />}
            {lead.website && <InfoRow icon={Globe} label="Website" value={lead.website} />}
            {lead.city && <InfoRow icon={MapPin} label="Location" value={[lead.city, lead.country].filter(Boolean).join(', ')} />}
            {lead.industry && <InfoRow icon={Briefcase} label="Industry" value={lead.industry} />}
            {lead.source && <InfoRow icon={Tag} label="Source" value={lead.source} />}
            {lead.assignedToName && <InfoRow icon={FileText} label="Assigned to" value={lead.assignedToName} />}
          </div>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" onClick={() => setView('leads')}>
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit customer
          </Button>
        </div>
      </div>

      {/* Right: tabs (timeline, notes, tasks, followups) */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col">
          <div className="border-b border-zinc-200 px-4 pt-3">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups ({followups.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="timeline" className="flex-1 overflow-y-auto custom-scroll p-4 m-0">
            {loading ? <div className="text-center py-8 text-zinc-500">Loading…</div> :
             timeline.length === 0 ? <div className="text-center py-8 text-zinc-500">No activity yet.</div> :
             timeline.map((group) => (
              <div key={group.date} className="mb-5">
                <div className="text-xs font-semibold text-zinc-500 uppercase mb-2">{formatDateHeader(group.date)}</div>
                <div className="space-y-2">
                  {group.events.map((ev: any) => <TimelineItem key={ev.id} event={ev} />)}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-y-auto custom-scroll p-4 m-0 space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an internal note (not visible to customer)…"
                rows={2}
                className="resize-none"
              />
              <Button onClick={addNote} disabled={!newNote.trim()}>Add</Button>
            </div>
            {notes.length === 0 ? <div className="text-center py-8 text-zinc-500">No notes yet.</div> :
             notes.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {(n.employeeName || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-zinc-500 mb-1">{n.employeeName} • {new Date(n.createdAt).toLocaleString()}</div>
                      <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteNote(n.id)}>×</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 overflow-y-auto custom-scroll p-4 m-0 space-y-2">
            {tasks.length === 0 ? <div className="text-center py-8 text-zinc-500">No tasks for this customer.</div> :
             tasks.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={cn('mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                      t.status === 'DONE' ? 'bg-purple-600 border-purple-600' : 'border-zinc-300')} />
                    <div className="flex-1">
                      <div className={cn('font-medium text-sm', t.status === 'DONE' && 'line-through opacity-60')}>{t.title}</div>
                      {t.description && <div className="text-xs text-zinc-600 mt-0.5">{t.description}</div>}
                      <div className="text-xs text-zinc-400 mt-1">
                        {t.priority} • {t.employeeName} {t.dueDate && `• Due ${new Date(t.dueDate).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="followups" className="flex-1 overflow-y-auto custom-scroll p-4 m-0 space-y-2">
            {followups.length === 0 ? <div className="text-center py-8 text-zinc-500">No follow-ups scheduled.</div> :
             followups.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{new Date(f.scheduledAt).toLocaleString()}</div>
                      <div className="text-xs text-zinc-500">Channel: {f.channel} • {f.employeeName} • {f.status}</div>
                      {f.notes && <div className="text-xs text-zinc-600 mt-1">{f.notes}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      <span className="text-xs text-zinc-500 w-20 shrink-0">{label}</span>
      <span className="text-sm flex-1 truncate">{value}</span>
    </div>
  )
}

function TimelineItem({ event }: { event: any }) {
  const ICONS: Record<string, any> = {
    MESSAGE_RECEIVED: MessageCircle,
    MESSAGE_SENT: MessageCircle,
    INCOMING_CALL: Phone,
    OUTBOUND_CALL: Phone,
    NOTE: StickyNote,
    TASK: CheckSquare,
    FOLLOWUP: CalendarClock,
    CUSTOMER_CREATED: Plus,
    ASSIGNMENT: Users,
    STATUS_CHANGE: Edit,
  }
  const Icon = ICONS[event.type] || FileText
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{event.title}</span>
          <span className="text-xs text-zinc-400 shrink-0">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {event.description && <p className="text-xs text-zinc-600 mt-0.5 whitespace-pre-wrap line-clamp-3">{event.description}</p>}
      </div>
    </div>
  )
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}
