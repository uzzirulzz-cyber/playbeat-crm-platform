'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CheckSquare, Plus, Check, X, Calendar, Flag } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']

export default function TasksView() {
  const { user, setActiveLeadId, setView } = useConsole()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('OPEN')

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filter !== 'ALL') qs.set('status', filter)
      const r = await api<{ tasks: any[] }>(`/api/tasks?${qs.toString()}`)
      setTasks(r.tasks || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function toggleStatus(t: any) {
    const newStatus = t.status === 'DONE' ? 'OPEN' : 'DONE'
    try {
      await api(`/api/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE' })
      toast.success('Task deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><CheckSquare className="w-5 h-5 text-purple-600" /> Tasks</h1>
          <p className="text-sm text-zinc-500">Action items linked to leads and customers.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> New Task</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'ALL'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              filter === f ? 'bg-purple-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center py-8 text-zinc-500">Loading…</div>}
        {!loading && tasks.length === 0 && (
          <Card><CardContent className="p-8 text-center text-zinc-500">
            <CheckSquare className="w-10 h-10 mx-auto opacity-30 mb-2" />
            No tasks. Create one to remind yourself to follow up.
          </CardContent></Card>
        )}
        {tasks.map((t) => (
          <Card key={t.id} className={cn(t.status === 'DONE' && 'opacity-60')}>
            <CardContent className="p-3 flex items-start gap-3">
              <button
                onClick={() => toggleStatus(t)}
                className={cn('mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  t.status === 'DONE' ? 'bg-purple-600 border-purple-600 text-white' : 'border-zinc-300 hover:border-purple-500')}
              >
                {t.status === 'DONE' && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium text-sm', t.status === 'DONE' && 'line-through')}>{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                </div>
                {t.description && <p className="text-xs text-zinc-600 mt-1">{t.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                  {t.leadId && (
                    <button onClick={() => { setActiveLeadId(t.leadId); setView('customers') }} className="hover:underline text-purple-700">
                      View lead
                    </button>
                  )}
                  <span>•</span>
                  <span>{t.employeeName || '—'}</span>
                  {t.dueDate && (
                    <>
                      <span>•</span>
                      <span className={cn('flex items-center gap-1', isOverdue(t.dueDate) && t.status !== 'DONE' && 'text-red-600')}>
                        <Calendar className="w-3 h-3" /> {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteTask(t.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {creating && <TaskDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-zinc-100 text-zinc-600',
    NORMAL: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-amber-100 text-amber-700',
    URGENT: 'bg-red-100 text-red-700',
  }
  return <Badge variant="secondary" className={cn('text-[10px]', colors[priority] || colors.NORMAL)}>{priority}</Badge>
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now()
}

function TaskDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ title: '', description: '', leadId: '', dueDate: '', priority: 'NORMAL' })

  async function save() {
    if (!form.title.trim()) { toast.error('Title required'); return }
    try {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Task created')
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Due date</Label>
              <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lead ID (optional)</Label>
            <Input value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} placeholder="Link to a lead…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
