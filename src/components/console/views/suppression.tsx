'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ShieldX } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

export default function SuppressionView() {
  const user = useConsole((s) => s.user)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const canManage = user && ['ADMIN','SUPER_ADMIN','CAMPAIGN_MANAGER','AGENT'].includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ suppressions: any[] }>('/api/suppression')
      setRows(r.suppressions || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function remove(id: string) {
    if (!confirm('Remove from suppression list?')) return
    try {
      await api(`/api/suppression/${id}`, { method: 'DELETE' })
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ShieldX className="w-5 h-5 text-red-500" /> Suppression List</h1>
          <p className="text-sm text-zinc-500">Contacts on this list are excluded from all marketing campaigns regardless of opt-in status.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Entry</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Type</th>
                <th className="text-left font-medium px-3 py-2.5">Value</th>
                <th className="text-left font-medium px-3 py-2.5">Reason</th>
                <th className="text-left font-medium px-3 py-2.5">Added</th>
                {canManage && <th className="text-right px-3 py-2.5">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-zinc-500">No suppressed contacts.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{r.type}</Badge></td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.value}</td>
                  <td className="px-3 py-2.5"><Badge variant="secondary" className="text-xs">{r.reason}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</td>
                  {canManage && (
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => remove(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {adding && <AddDialog onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
    </div>
  )
}

function AddDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState('EMAIL')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('MANUAL')

  async function add() {
    try {
      await api('/api/suppression', { method: 'POST', body: JSON.stringify({ type, value, reason }) })
      toast.success('Suppression entry added')
      onDone()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Suppression Entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="GLOBAL">Global (all channels)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Value (email or phone)"><Input value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <Field label="Reason">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="UNSUBSCRIBE">Unsubscribe</SelectItem>
                <SelectItem value="BOUNCE">Bounce</SelectItem>
                <SelectItem value="COMPLAINT">Complaint</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={add}>Add</Button>
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
