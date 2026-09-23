'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings as SettingsIcon, Save, Activity } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export default function SettingsView() {
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [health, setHealth] = useState<any>(null)

  async function load() {
    setLoading(true)
    try {
      const [s, h] = await Promise.all([
        api<{ settings: any[] }>('/api/settings'),
        api<any>('/api/health').catch(() => null),
      ])
      setSettings(s.settings || [])
      if (h) setHealth(h)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function setVal(key: string, value: string) {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s))
  }

  async function saveAll() {
    setSaving(true)
    try {
      await api('/api/settings', { method: 'POST', body: JSON.stringify(settings) })
      toast.success('Settings saved')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const groups: Record<string, any[]> = {}
  settings.forEach((s) => {
    if (!groups[s.category]) groups[s.category] = []
    groups[s.category].push(s)
  })

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-zinc-500" /> Settings</h1>
        <p className="text-sm text-zinc-500">System-wide configuration. Provider credentials live in Integrations.</p>
      </div>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> System Health</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-sm"><span className="text-zinc-500">Server:</span> <Badge variant="outline" className="ml-1 text-emerald-600">{health.server}</Badge></div>
            <div className="text-sm"><span className="text-zinc-500">Database:</span> <Badge variant="outline" className="ml-1 text-emerald-600">{String(health.database)}</Badge></div>
            <div className="text-sm"><span className="text-zinc-500">WhatsApp:</span> <Badge variant="outline" className="ml-1">{String(health.whatsapp)}</Badge></div>
            <div className="text-sm"><span className="text-zinc-500">Email:</span> <Badge variant="outline" className="ml-1">{String(health.email)}</Badge></div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="p-8 text-center text-zinc-500">Loading…</div>
      ) : (
        <>
          {Object.entries(groups).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader><CardTitle className="text-base">{cat}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map((s) => (
                  <div key={s.id} className="grid grid-cols-3 gap-3 items-center">
                    <Label className="text-xs text-zinc-600 font-mono">{s.key}</Label>
                    <Input className="col-span-2" value={s.value} onChange={(e) => setVal(s.key, e.target.value)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end">
            <Button onClick={saveAll} disabled={saving}><Save className="w-4 h-4 mr-1.5" /> Save All</Button>
          </div>
        </>
      )}
    </div>
  )
}
