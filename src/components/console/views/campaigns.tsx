'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Megaphone, Plus, Play, Pause, X, RefreshCw, FileText, CheckCheck, Eye, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

export default function CampaignsView() {
  const user = useConsole((s) => s.user)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [detail, setDetail] = useState<any | null>(null)
  const canManage = user && ['ADMIN','SUPER_ADMIN','CAMPAIGN_MANAGER'].includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ campaigns: any[] }>('/api/campaigns')
      setCampaigns(r.campaigns || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000) // auto-refresh to show queue progress
    return () => clearInterval(t)
  }, [])

  async function start(id: string) {
    try {
      await api(`/api/campaigns/${id}/start`, { method: 'POST' })
      toast.success('Campaign started')
      load()
    } catch (e: any) { toast.error(e.message) }
  }
  async function pause(id: string) {
    try {
      await api(`/api/campaigns/${id}/pause`, { method: 'POST' })
      toast.success('Paused')
      load()
    } catch (e: any) { toast.error(e.message) }
  }
  async function cancel(id: string) {
    if (!confirm('Cancel this campaign?')) return
    try {
      await api(`/api/campaigns/${id}/cancel`, { method: 'POST' })
      toast.success('Cancelled')
      load()
    } catch (e: any) { toast.error(e.message) }
  }
  async function viewDetail(id: string) {
    try {
      const r = await api<{ campaign: any; recipients: any[] }>(`/api/campaigns/${id}`)
      setDetail(r)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Megaphone className="w-5 h-5 text-purple-500" /> Campaigns</h1>
          <p className="text-sm text-zinc-500">Email, WhatsApp, or combined broadcasts. Queue runs in background; status updates in real time.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> New Campaign</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Channel</th>
                <th className="text-left font-medium px-3 py-2.5">Segment</th>
                <th className="text-left font-medium px-3 py-2.5">Progress</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && campaigns.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">No campaigns yet.</td></tr>}
              {campaigns.map((c) => {
                const stats = c.stats || {}
                const total = stats.total || 0
                const done = (stats.sent || 0) + (stats.failed || 0)
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2.5">
                      <button className="font-medium text-zinc-900 hover:underline" onClick={() => viewDetail(c.id)}>{c.name}</button>
                      <div className="text-xs text-zinc-500">By {c.createdByName || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{c.channel}</Badge></td>
                    <td className="px-3 py-2.5 text-zinc-600">{c.segmentName || '—'}</td>
                    <td className="px-3 py-2.5 min-w-32">
                      <div className="text-xs text-zinc-500 mb-1">{done} / {total} ({pct}%)</div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="secondary" className="text-xs">{c.status}</Badge></td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && c.status === 'DRAFT' && (
                          <Button size="sm" variant="default" className="h-7 bg-emerald-500 hover:bg-emerald-400" onClick={() => start(c.id)}><Play className="w-3 h-3 mr-1" /> Start</Button>
                        )}
                        {canManage && c.status === 'RUNNING' && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => pause(c.id)}><Pause className="w-3 h-3 mr-1" /> Pause</Button>
                        )}
                        {canManage && c.status === 'PAUSED' && (
                          <Button size="sm" variant="default" className="h-7 bg-emerald-500 hover:bg-emerald-400" onClick={() => start(c.id)}><Play className="w-3 h-3 mr-1" /> Resume</Button>
                        )}
                        {canManage && ['RUNNING','PAUSED','QUEUED','SCHEDULED'].includes(c.status) && (
                          <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => cancel(c.id)}><X className="w-3 h-3" /></Button>
                        )}
                        {canManage && ['DRAFT','COMPLETED','CANCELLED','FAILED'].includes(c.status) && (
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(c)}>Edit</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <CampaignDialog campaign={editing} onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => { setCreating(false); setEditing(null); load() }} />
      )}

      {detail && (
        <Dialog open onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{detail.campaign.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
                <Stat label="Total" value={detail.campaign.stats?.total || 0} />
                <Stat label="Sent" value={detail.campaign.stats?.sent || 0} color="text-emerald-600" />
                <Stat label="Delivered" value={detail.campaign.stats?.delivered || 0} color="text-emerald-600" />
                <Stat label="Read" value={detail.campaign.stats?.read || 0} color="text-emerald-600" />
                <Stat label="Failed" value={detail.campaign.stats?.failed || 0} color="text-red-600" />
                <Stat label="Queued" value={detail.campaign.stats?.queued || 0} />
              </div>
              <div className="text-sm">
                <div className="text-zinc-500 mb-1">Message:</div>
                <div className="p-2 bg-zinc-50 rounded border text-zinc-700 whitespace-pre-wrap">{detail.campaign.message}</div>
              </div>
              <div className="max-h-72 overflow-y-auto custom-scroll border border-zinc-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 text-zinc-600">
                    <tr><th className="text-left px-2 py-1.5">Lead</th><th className="text-left px-2 py-1.5">Contact</th><th className="text-left px-2 py-1.5">Status</th><th className="text-left px-2 py-1.5">Provider ID</th><th className="text-left px-2 py-1.5">Error</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.recipients.slice(0, 200).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-2 py-1">{r.leadName || '—'}</td>
                        <td className="px-2 py-1">{r.leadEmail || r.leadPhone || '—'}</td>
                        <td className="px-2 py-1"><Badge variant="outline" className="text-[10px]">{r.status}</Badge></td>
                        <td className="px-2 py-1 font-mono text-[10px]">{r.providerId || '—'}</td>
                        <td className="px-2 py-1 text-red-500">{r.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-zinc-50 rounded border border-zinc-200 px-2 py-1.5">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color || ''}`}>{value}</div>
    </div>
  )
}

function CampaignDialog({ campaign, onClose, onSaved }: { campaign: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!campaign
  const [form, setForm] = useState<any>(campaign ? { ...campaign } : {
    name: '', channel: 'EMAIL', segmentId: '', subject: '', message: '', templateId: '', status: 'DRAFT',
  })
  const [segments, setSegments] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      api<{ segments: any[] }>('/api/segments'),
      api<{ templates: any[] }>('/api/templates'),
    ]).then(([s, t]) => {
      setSegments(s.segments || [])
      setTemplates((t.templates || []).filter((tp) => tp.channel === form.channel || form.channel === 'COMBINED'))
    })
  }, [form.channel])

  async function save() {
    try {
      const segment = segments.find((s) => s.id === form.segmentId)
      const body = {
        name: form.name,
        channel: form.channel,
        segmentId: form.segmentId || null,
        segmentName: segment?.name || null,
        subject: form.subject || null,
        message: form.message,
        templateId: form.templateId || null,
        status: form.status || 'DRAFT',
      }
      if (isEdit) {
        await api(`/api/campaigns/${campaign.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Campaign updated')
      } else {
        await api('/api/campaigns', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Campaign created')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Campaign' : 'New Campaign'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Campaign Name"><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Channel">
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="COMBINED">Combined (Email preferred, WhatsApp fallback)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Audience / Segment">
            <Select value={form.segmentId || '__none'} onValueChange={(v) => setForm({ ...form, segmentId: v === '__none' ? '' : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— No segment (all eligible) —</SelectItem>
                {segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Template (optional)">
            <Select value={form.templateId || '__none'} onValueChange={(v) => setForm({ ...form, templateId: v === '__none' ? '' : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— None —</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {form.channel !== 'WHATSAPP' && (
            <Field label="Subject"><Input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          )}
          <div className="col-span-2">
            <Field label="Message">
              <Textarea rows={6} value={form.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Use {{business_name}}, {{contact_name}}, {{city}}, {{country}}, {{website}}, {{email}} for personalization." />
            </Field>
          </div>
          <div className="col-span-2 text-xs text-zinc-500">
            Eligible contacts: opt-in true (Email/WhatsApp), not suppressed, not on do-not-contact list.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{isEdit ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-600">{label}</Label>
      {children}
    </div>
  )
}
