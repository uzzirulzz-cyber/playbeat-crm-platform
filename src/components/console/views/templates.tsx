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
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

export default function TemplatesView() {
  const user = useConsole((s) => s.user)
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const canManage = user && ['ADMIN','SUPER_ADMIN','CAMPAIGN_MANAGER'].includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ templates: any[] }>('/api/templates')
      setTemplates(r.templates || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Templates</h1>
          <p className="text-sm text-zinc-500">Reusable message templates with personalization variables. WhatsApp templates must be approved in Meta Business Manager.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> New Template</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && <div className="col-span-full text-center py-8 text-zinc-500">Loading…</div>}
        {!loading && templates.length === 0 && <div className="col-span-full text-center py-8 text-zinc-500">No templates yet.</div>}
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{t.name}</span>
                </div>
                <div className="flex gap-1">
                  {canManage && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(t)}><Pencil className="w-3.5 h-3.5" /></Button>}
                  {canManage && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={async () => {
                    if (!confirm(`Delete template "${t.name}"?`)) return
                    try { await api(`/api/templates/${t.id}`, { method: 'DELETE' }); load() } catch (e: any) { toast.error(e.message) }
                  }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs">{t.channel}</Badge>
                <Badge variant="outline" className="text-xs">{t.category}</Badge>
                <Badge variant="outline" className="text-xs">{t.language}</Badge>
                {t.approved && <Badge className="bg-emerald-500/15 text-emerald-700 text-xs border-emerald-500/30">Approved</Badge>}
              </div>
              {t.subject && <div className="text-xs text-zinc-500">Subject: <span className="font-mono text-zinc-700">{t.subject}</span></div>}
              <div className="text-xs text-zinc-600 whitespace-pre-wrap bg-zinc-50 p-2 rounded border border-zinc-200 line-clamp-4">{t.body}</div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(t.variables || []).map((v: string) => <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(creating || editing) && (
        <TemplateDialog template={editing} onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => { setCreating(false); setEditing(null); load() }} />
      )}
    </div>
  )
}

function TemplateDialog({ template, onClose, onSaved }: { template: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!template
  const [form, setForm] = useState<any>(template ? { ...template } : {
    name: '', channel: 'EMAIL', category: 'MARKETING', language: 'en', subject: '', body: '', approved: false,
  })

  async function save() {
    try {
      if (isEdit) {
        await api(`/api/templates/${template.id}`, { method: 'PUT', body: JSON.stringify(form) })
        toast.success('Template updated')
      } else {
        await api('/api/templates', { method: 'POST', body: JSON.stringify(form) })
        toast.success('Template created')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Name"><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Channel">
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="UTILITY">Utility</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Language"><Input value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="en" /></Field>
          {form.channel === 'EMAIL' && (
            <div className="col-span-2">
              <Field label="Subject"><Input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
            </div>
          )}
          <div className="col-span-2">
            <Field label="Body">
              <Textarea rows={8} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Hi {{contact_name}}, {{business_name}} in {{city}}…" />
            </Field>
          </div>
          <label className="flex items-center gap-2 col-span-2 text-sm">
            <input type="checkbox" checked={!!form.approved} onChange={(e) => setForm({ ...form, approved: e.target.checked })} />
            Approved (for WhatsApp templates, this means Meta approved the template)
          </label>
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
