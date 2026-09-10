'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

export default function SegmentsView() {
  const user = useConsole((s) => s.user)
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState<any | null>(null)
  const canManage = user && ['ADMIN','SUPER_ADMIN','CAMPAIGN_MANAGER'].includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ segments: any[] }>('/api/segments')
      setSegments(r.segments || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Segments</h1>
          <p className="text-sm text-zinc-500">Saved reusable lead filters for use in campaigns.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> New Segment</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Description</th>
                <th className="text-left font-medium px-3 py-2.5">Filters</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={4} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && segments.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-zinc-500">No segments yet.</td></tr>}
              {segments.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium">{s.name}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{s.description || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(s.filters || {}).map(([k, v]: any) => (
                        <Badge key={k} variant="secondary" className="text-xs">{k}{Array.isArray(v) ? `: ${v.join('|')}` : `: ${String(v)}`}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                        try {
                          const r = await api<{ leads: any[]; count: number }>(`/api/segments/${s.id}`)
                          setPreviewing({ segment: s, ...r })
                        } catch (e: any) { toast.error(e.message) }
                      }}><Eye className="w-3.5 h-3.5" /></Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={async () => {
                            if (!confirm(`Delete segment "${s.name}"?`)) return
                            try { await api(`/api/segments/${s.id}`, { method: 'DELETE' }); toast.success('Deleted'); load() } catch (e: any) { toast.error(e.message) }
                          }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <SegmentDialog segment={editing} onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => { setCreating(false); setEditing(null); load() }} />
      )}

      {previewing && (
        <Dialog open onOpenChange={() => setPreviewing(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Segment: {previewing.segment.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-zinc-600">{previewing.count} matching leads</div>
              <div className="max-h-80 overflow-y-auto border border-zinc-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 text-zinc-600">
                    <tr><th className="text-left px-2 py-1.5">Business</th><th className="text-left px-2 py-1.5">City</th><th className="text-left px-2 py-1.5">Category</th><th className="text-left px-2 py-1.5">Score</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewing.leads.slice(0, 200).map((l: any) => (
                      <tr key={l.id}><td className="px-2 py-1">{l.businessName}</td><td className="px-2 py-1">{l.city}</td><td className="px-2 py-1">{l.category}</td><td className="px-2 py-1 tabular-nums">{l.score}</td></tr>
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

function SegmentDialog({ segment, onClose, onSaved }: { segment: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!segment
  const [name, setName] = useState(segment?.name || '')
  const [description, setDescription] = useState(segment?.description || '')
  const [filters, setFilters] = useState<any>(segment?.filters || { city: '', category: '', country: '', status: '', scoreMin: '', tags: '' })
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  async function preview() {
    try {
      const f: any = {}
      if (filters.city) f.city = filters.city
      if (filters.category) f.category = filters.category
      if (filters.country) f.country = filters.country
      if (filters.status) f.status = filters.status
      if (filters.scoreMin) f.scoreMin = Number(filters.scoreMin)
      if (filters.tags) f.tags = filters.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
      const r = await api<{ count: number }>('/api/segments', { method: 'PUT', body: JSON.stringify({ filters: f }) })
      setPreviewCount(r.count)
    } catch (e: any) { toast.error(e.message) }
  }

  async function save() {
    try {
      const f: any = {}
      if (filters.city) f.city = filters.city
      if (filters.category) f.category = filters.category
      if (filters.country) f.country = filters.country
      if (filters.status) f.status = filters.status
      if (filters.scoreMin) f.scoreMin = Number(filters.scoreMin)
      if (filters.tags) f.tags = filters.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
      const body = { name, description, filters: f }
      if (isEdit) {
        await api(`/api/segments/${segment.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Segment updated')
      } else {
        await api('/api/segments', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Segment created')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Segment' : 'New Segment'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><Input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} /></Field>
            <Field label="Category"><Input value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} /></Field>
            <Field label="Country"><Input value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} /></Field>
            <Field label="Status"><Input value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} placeholder="NEW" /></Field>
            <Field label="Min Score"><Input type="number" value={filters.scoreMin} onChange={(e) => setFilters({ ...filters, scoreMin: e.target.value })} /></Field>
            <Field label="Tags (comma)"><Input value={filters.tags} onChange={(e) => setFilters({ ...filters, tags: e.target.value })} placeholder="b2b, saas" /></Field>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={preview}>Preview count</Button>
            {previewCount !== null && <span className="text-sm text-zinc-600">{previewCount} matching leads</span>}
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
