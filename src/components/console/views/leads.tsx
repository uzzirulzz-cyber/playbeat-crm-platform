'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Plus, Upload, Filter, Pencil, Trash2, Search } from 'lucide-react'
import { api, downloadBlob, fileToBase64 } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

const STATUSES = ['NEW','CONTACTED','REPLIED','QUALIFIED','INTERESTED','NOT_INTERESTED','CONVERTED','BOUNCED','UNSUBSCRIBED','DO_NOT_CONTACT']

export default function LeadsView() {
  const user = useConsole((s) => s.user)
  const setView = useConsole((s) => s.setView)
  const [leads, setLeads] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<any>({ search: '', city: '', category: '', status: '', country: '' })
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const canManage = user && ['ADMIN','SUPER_ADMIN','CAMPAIGN_MANAGER','AGENT'].includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filters.search) qs.set('search', filters.search)
      if (filters.city) qs.set('city', filters.city)
      if (filters.category) qs.set('category', filters.category)
      if (filters.status) qs.set('status', filters.status)
      if (filters.country) qs.set('country', filters.country)
      qs.set('page', String(page))
      qs.set('pageSize', String(pageSize))
      const r = await api<{ leads: any[]; total: number }>(`/api/leads?${qs.toString()}`)
      setLeads(r.leads || [])
      setTotal(r.total || 0)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])
  useEffect(() => { setPage(1); load() }, [filters.search, filters.city, filters.category, filters.status, filters.country])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function exportCSV() {
    const qs = new URLSearchParams()
    if (filters.city) qs.set('city', filters.city)
    if (filters.category) qs.set('category', filters.category)
    if (filters.status) qs.set('status', filters.status)
    downloadBlob(`/api/export/leads?${qs.toString()}`, `leads-${Date.now()}.csv`)
  }

  function exportXLSX() {
    const qs = new URLSearchParams()
    if (filters.city) qs.set('city', filters.city)
    if (filters.category) qs.set('category', filters.category)
    if (filters.status) qs.set('status', filters.status)
    downloadBlob(`/api/export/leads/xlsx?${qs.toString()}`, `leads-${Date.now()}.xlsx`)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-zinc-500">{total} total leads. Duplicate-checked on email, WhatsApp, website, and business name + city.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={exportXLSX}><Download className="w-4 h-4 mr-1.5" /> XLSX</Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setImporting(true)}><Upload className="w-4 h-4 mr-1.5" /> Import</Button>
              <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Lead</Button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search…"
                value={filters.search}
                onChange={(e) => setFilters((f: any) => ({ ...f, search: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Input placeholder="City" value={filters.city} onChange={(e) => setFilters((f: any) => ({ ...f, city: e.target.value }))} />
            <Input placeholder="Category" value={filters.category} onChange={(e) => setFilters((f: any) => ({ ...f, category: e.target.value }))} />
            <Input placeholder="Country" value={filters.country} onChange={(e) => setFilters((f: any) => ({ ...f, country: e.target.value }))} />
            <Select value={filters.status} onValueChange={(v) => setFilters((f: any) => ({ ...f, status: v === '__any' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left font-medium px-3 py-2.5">Business</th>
                  <th className="text-left font-medium px-3 py-2.5">Contact</th>
                  <th className="text-left font-medium px-3 py-2.5">Email</th>
                  <th className="text-left font-medium px-3 py-2.5">WhatsApp</th>
                  <th className="text-left font-medium px-3 py-2.5">City</th>
                  <th className="text-left font-medium px-3 py-2.5">Category</th>
                  <th className="text-left font-medium px-3 py-2.5">Score</th>
                  <th className="text-left font-medium px-3 py-2.5">Status</th>
                  {canManage && <th className="text-right px-3 py-2.5">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading && (
                  <tr><td colSpan={9} className="text-center py-8 text-zinc-500">Loading…</td></tr>
                )}
                {!loading && leads.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-zinc-500">No leads found.</td></tr>
                )}
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-zinc-900">{l.businessName}</div>
                      {l.website && <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{l.website}</a>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600">{l.contactPerson || '—'}</td>
                    <td className="px-3 py-2.5">
                      {l.email ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{l.email}</span>
                          <div className="flex gap-1">
                            {l.emailOptIn && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">opt-in</Badge>}
                            {l.emailVerified && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">verified</Badge>}
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {l.whatsapp ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{l.whatsapp}</span>
                          {l.whatsappOptIn && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 w-fit">opt-in</Badge>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600">{l.city || '—'}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{l.category || '—'}</td>
                    <td className="px-3 py-2.5"><span className="tabular-nums">{l.score}</span></td>
                    <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{l.status}</Badge></td>
                    {canManage && (
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(l)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={async () => {
                            if (!confirm(`Delete lead "${l.businessName}"?`)) return
                            try { await api(`/api/leads/${l.id}`, { method: 'DELETE' }); toast.success('Lead deleted'); load() }
                            catch (e:any) { toast.error(e.message) }
                          }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>Page {page} of {totalPages} · {total} leads</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {(creating || editing) && (
        <LeadDialog
          lead={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}

      {importing && (
        <ImportDialog onClose={() => setImporting(false)} onDone={() => { setImporting(false); load() }} />
      )}
    </div>
  )
}

function LeadDialog({ lead, onClose, onSaved }: { lead: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!lead
  const [form, setForm] = useState<any>(lead ? { ...lead } : {
    businessName: '', contactPerson: '', email: '', whatsapp: '', country: '', state: '', city: '',
    category: '', website: '', source: 'Manual', score: 0, status: 'NEW', emailOptIn: false, whatsappOptIn: false, tags: []
  })

  async function save() {
    try {
      if (isEdit) {
        await api(`/api/leads/${lead.id}`, { method: 'PUT', body: JSON.stringify(form) })
        toast.success('Lead updated')
      } else {
        await api('/api/leads', { method: 'POST', body: JSON.stringify(form) })
        toast.success('Lead created')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Business Name *"><Input value={form.businessName || ''} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></Field>
          <Field label="Contact Person"><Input value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+923001234567" /></Field>
          <Field label="Country"><Input value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="State / Province"><Input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Category"><Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Website"><Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
          <Field label="Source"><Input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
          <Field label="Score (0–100)"><Input type="number" value={form.score || 0} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes (full row)">
            <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </Field>
          <div className="flex flex-col gap-2 justify-end">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.emailOptIn} onCheckedChange={(v) => setForm({ ...form, emailOptIn: !!v })} /> Email opt-in</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.whatsappOptIn} onCheckedChange={(v) => setForm({ ...form, whatsappOptIn: !!v })} /> WhatsApp opt-in</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.doNotContact} onCheckedChange={(v) => setForm({ ...form, doNotContact: !!v })} /> Do not contact</label>
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

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState('paste')
  const [pasteData, setPasteData] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [committing, setCommitting] = useState(false)

  async function doPreview() {
    try {
      let payload: any
      if (tab === 'paste') {
        const rows = pasteData.split(/\r?\n/).filter(Boolean).map((line) => {
          const p = line.split(/[,\t;|]/).map((s) => s.trim())
          return { businessName: p[0], contactPerson: p[1], email: p[2], whatsapp: p[3], city: p[4], country: p[5], category: p[6] }
        })
        payload = { source: 'json', data: JSON.stringify(rows), mode: 'preview' }
      } else if (tab === 'csv' && csvFile) {
        const text = await csvFile.text()
        payload = { source: 'csv', data: text, mode: 'preview' }
      } else if (tab === 'xlsx' && xlsxFile) {
        const b64 = await fileToBase64(xlsxFile)
        payload = { source: 'xlsx', data: b64, mode: 'preview' }
      } else {
        toast.error('Provide data first')
        return
      }
      const r = await api<any>('/api/leads/import', { method: 'POST', body: JSON.stringify(payload) })
      setPreview(r)
    } catch (e: any) { toast.error(e.message) }
  }

  async function doCommit() {
    try {
      setCommitting(true)
      let payload: any
      if (tab === 'paste') {
        const rows = pasteData.split(/\r?\n/).filter(Boolean).map((line) => {
          const p = line.split(/[,\t;|]/).map((s) => s.trim())
          return { businessName: p[0], contactPerson: p[1], email: p[2], whatsapp: p[3], city: p[4], country: p[5], category: p[6] }
        })
        payload = { source: 'json', data: JSON.stringify(rows), mode: 'commit' }
      } else if (tab === 'csv' && csvFile) {
        const text = await csvFile.text()
        payload = { source: 'csv', data: text, mode: 'commit' }
      } else if (tab === 'xlsx' && xlsxFile) {
        const b64 = await fileToBase64(xlsxFile)
        payload = { source: 'xlsx', data: b64, mode: 'commit' }
      } else { return }
      const r = await api<any>('/api/leads/import', { method: 'POST', body: JSON.stringify(payload) })
      toast.success(`Imported ${r.created} of ${r.total} rows`)
      onDone()
    } catch (e: any) { toast.error(e.message) } finally { setCommitting(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="paste">Bulk Paste</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="xlsx">XLSX</TabsTrigger>
          </TabsList>
          <TabsContent value="paste" className="space-y-2">
            <p className="text-xs text-zinc-500">Format per line: businessName, contact, email, whatsapp, city, country, category</p>
            <Textarea rows={6} value={pasteData} onChange={(e) => setPasteData(e.target.value)} placeholder="Acme Co, John Doe, john@acme.com, +923001234567, Lahore, Pakistan, Retail" />
          </TabsContent>
          <TabsContent value="csv">
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
          </TabsContent>
          <TabsContent value="xlsx">
            <input type="file" accept=".xlsx" onChange={(e) => setXlsxFile(e.target.files?.[0] || null)} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={doPreview}>Preview</Button>
          <Button onClick={doCommit} disabled={committing}>{committing ? 'Importing…' : 'Commit Import'}</Button>
        </div>

        {preview && (
          <div className="border rounded-md p-3 bg-zinc-50 space-y-2 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Total rows" value={preview.analysis.totalRows} />
              <Stat label="Valid emails" value={preview.analysis.validEmails} />
              <Stat label="Invalid emails" value={preview.analysis.invalidEmails} />
              <Stat label="Valid WhatsApp" value={preview.analysis.validWhatsApps} />
              <Stat label="Invalid WhatsApp" value={preview.analysis.invalidWhatsApps} />
              <Stat label="Missing data" value={preview.analysis.missingData} />
              <Stat label="Duplicates" value={preview.analysis.duplicates} />
              <Stat label="Will skip" value={preview.analysis.skipRows.length} />
            </div>
            <div className="max-h-40 overflow-y-auto custom-scroll border border-zinc-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="text-left px-2 py-1.5">#</th>
                    <th className="text-left px-2 py-1.5">Business</th>
                    <th className="text-left px-2 py-1.5">Email</th>
                    <th className="text-left px-2 py-1.5">WhatsApp</th>
                    <th className="text-left px-2 py-1.5">City</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.preview.slice(0, 50).map((p: any, i: number) => (
                    <tr key={i} className={preview.analysis.duplicateRows.includes(i) ? 'bg-amber-50' : preview.analysis.skipRows.includes(i) ? 'bg-red-50' : ''}>
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{p.businessName || '—'}</td>
                      <td className="px-2 py-1">{p.email || '—'}</td>
                      <td className="px-2 py-1">{p.whatsapp || '—'}</td>
                      <td className="px-2 py-1">{p.city || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500">Amber = duplicate, Red = missing required fields. Only non-duplicate, complete rows will be committed.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded border border-zinc-200 px-2 py-1.5">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}
