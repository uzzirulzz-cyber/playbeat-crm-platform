'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserCog, Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

const ROLES = ['SUPER_ADMIN','ADMIN','CAMPAIGN_MANAGER','AGENT','VIEWER']

export default function UsersView() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ users: any[] }>('/api/users')
      setUsers(r.users || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><UserCog className="w-5 h-5 text-zinc-500" /> Users</h1>
          <p className="text-sm text-zinc-500">Role-based access control. SUPER_ADMIN, ADMIN, CAMPAIGN_MANAGER, AGENT, VIEWER.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> New User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Email</th>
                <th className="text-left font-medium px-3 py-2.5">Role</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Last Login</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium">{u.name}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{u.email}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{u.role}</Badge></td>
                  <td className="px-3 py-2.5"><Badge className={u.active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-red-500/15 text-red-700 border-red-500/30'}>{u.active ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={async () => {
                        if (!confirm(`Delete user "${u.email}"?`)) return
                        try { await api(`/api/users/${u.id}`, { method: 'DELETE' }); load() } catch (e: any) { toast.error(e.message) }
                      }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <UserDialog user={editing} onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => { setCreating(false); setEditing(null); load() }} />
      )}
    </div>
  )
}

function UserDialog({ user, onClose, onSaved }: { user: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user
  const [form, setForm] = useState<any>(user ? { ...user } : { name: '', email: '', password: '', role: 'VIEWER', active: true })
  async function save() {
    try {
      if (isEdit) {
        const body: any = { name: form.name, role: form.role, active: form.active }
        if (form.password) body.password = form.password
        await api(`/api/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('User updated')
      } else {
        await api('/api/users', { method: 'POST', body: JSON.stringify(form) })
        toast.success('User created')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit User' : 'New User'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={isEdit} /></Field>
          <Field label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}>
            <Input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Account active
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
