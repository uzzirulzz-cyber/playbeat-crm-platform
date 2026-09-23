'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plug, MessageCircle, Mail, Save, RefreshCw, ExternalLink, BarChart3 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'

export default function IntegrationsView() {
  const user = useConsole((s) => s.user)
  const setConnectionStatus = useConsole((s) => s.setConnectionStatus)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [wa, setWa] = useState<any>({ accessToken: '', phoneNumberId: '', businessAccountId: '', verifyToken: '', apiVersion: 'v21.0' })
  const [em, setEm] = useState<any>({ smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', smtpFrom: '', imapHost: '', imapPort: 993, imapUser: '', imapPassword: '' })
  const [meta, setMeta] = useState<any>({ accessToken: '', pixelId: '', apiVersion: 'v21.0', testEventCode: '' })
  const canManage = user && ['ADMIN','SUPER_ADMIN'].includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ integrations: any[] }>('/api/integrations')
      setIntegrations(r.integrations || [])
      const waRow = r.integrations.find((i) => i.provider === 'WHATSAPP')
      const emRow = r.integrations.find((i) => i.provider === 'EMAIL')
      const metaRow = r.integrations.find((i) => i.provider === 'META_CAPI')
      setConnectionStatus({
        whatsapp: waRow?.status || 'DISCONNECTED',
        email: emRow?.status || 'DISCONNECTED',
      })
      if (waRow?.config) setWa((prev: any) => ({ ...prev, ...waRow.config }))
      if (emRow?.config) setEm((prev: any) => ({ ...prev, ...emRow.config }))
      if (metaRow?.config) setMeta((prev: any) => ({ ...prev, ...metaRow.config }))
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function saveWhatsApp() {
    setSaving(true)
    try {
      await api('/api/integrations', { method: 'POST', body: JSON.stringify({ provider: 'WHATSAPP', config: wa }) })
      toast.success('WhatsApp integration saved')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function saveEmail() {
    setSaving(true)
    try {
      await api('/api/integrations', { method: 'POST', body: JSON.stringify({ provider: 'EMAIL', config: em }) })
      toast.success('Email integration saved')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function saveMeta() {
    setSaving(true)
    try {
      await api('/api/integrations', { method: 'POST', body: JSON.stringify({ provider: 'META_CAPI', config: meta }) })
      toast.success('Meta Conversions API integration saved')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const waStatus = integrations.find((i) => i.provider === 'WHATSAPP')?.status || 'DISCONNECTED'
  const emStatus = integrations.find((i) => i.provider === 'EMAIL')?.status || 'DISCONNECTED'
  const metaStatus = integrations.find((i) => i.provider === 'META_CAPI')?.status || 'DISCONNECTED'

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Plug className="w-5 h-5 text-zinc-500" /> Integrations</h1>
        <p className="text-sm text-zinc-500">Configure WhatsApp Cloud API and SMTP/IMAP credentials. Secrets are stored server-side; the UI shows masked values for existing credentials.</p>
      </div>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp Business Cloud API</CardTitle>
            {waStatus === 'CONNECTED'
              ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Connected</Badge>
              : <Badge variant="outline" className="text-zinc-500">NOT CONNECTED</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Access Token">
              <Input type="password" value={wa.accessToken || ''} onChange={(e) => setWa({ ...wa, accessToken: e.target.value })} placeholder="EAAG…" disabled={!canManage} />
            </Field>
            <Field label="Phone Number ID">
              <Input value={wa.phoneNumberId || ''} onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value })} placeholder="103…" disabled={!canManage} />
            </Field>
            <Field label="Business Account ID">
              <Input value={wa.businessAccountId || ''} onChange={(e) => setWa({ ...wa, businessAccountId: e.target.value })} disabled={!canManage} />
            </Field>
            <Field label="Webhook Verify Token">
              <Input value={wa.verifyToken || ''} onChange={(e) => setWa({ ...wa, verifyToken: e.target.value })} placeholder="your-verify-token" disabled={!canManage} />
            </Field>
            <Field label="API Version">
              <Input value={wa.apiVersion || 'v21.0'} onChange={(e) => setWa({ ...wa, apiVersion: e.target.value })} disabled={!canManage} />
            </Field>
          </div>
          <div className="text-xs text-zinc-500 pt-2">
            Webhook URL (set this in Meta dashboard): <code className="bg-zinc-100 px-1.5 py-0.5 rounded">https://your-domain.com/api/webhooks/whatsapp</code>
            <br />Verify token must match what you put in Meta's webhook setup. Set <code className="bg-zinc-100 px-1.5 py-0.5 rounded">hub.mode=subscribe&hub.verify_token=…</code> on first verification.
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
              WhatsApp Cloud API docs <ExternalLink className="w-3 h-3" />
            </a>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload</Button>
                <Button size="sm" onClick={saveWhatsApp} disabled={saving}><Save className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-blue-500" /> SMTP / IMAP</CardTitle>
            {emStatus === 'CONNECTED'
              ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Connected</Badge>
              : <Badge variant="outline" className="text-zinc-500">NOT CONNECTED</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP Host"><Input value={em.smtpHost || ''} onChange={(e) => setEm({ ...em, smtpHost: e.target.value })} placeholder="smtp.gmail.com" disabled={!canManage} /></Field>
            <Field label="SMTP Port"><Input type="number" value={em.smtpPort || 587} onChange={(e) => setEm({ ...em, smtpPort: Number(e.target.value) })} disabled={!canManage} /></Field>
            <Field label="SMTP User"><Input value={em.smtpUser || ''} onChange={(e) => setEm({ ...em, smtpUser: e.target.value })} disabled={!canManage} /></Field>
            <Field label="SMTP Password"><Input type="password" value={em.smtpPassword || ''} onChange={(e) => setEm({ ...em, smtpPassword: e.target.value })} disabled={!canManage} /></Field>
            <Field label="From Address"><Input value={em.smtpFrom || ''} onChange={(e) => setEm({ ...em, smtpFrom: e.target.value })} placeholder="you@business.com" disabled={!canManage} /></Field>
            <div className="border-t border-zinc-100 col-span-2 mt-1 pt-3 text-xs text-zinc-500">IMAP (optional, for receiving inbound email)</div>
            <Field label="IMAP Host"><Input value={em.imapHost || ''} onChange={(e) => setEm({ ...em, imapHost: e.target.value })} disabled={!canManage} /></Field>
            <Field label="IMAP Port"><Input type="number" value={em.imapPort || 993} onChange={(e) => setEm({ ...em, imapPort: Number(e.target.value) })} disabled={!canManage} /></Field>
            <Field label="IMAP User"><Input value={em.imapUser || ''} onChange={(e) => setEm({ ...em, imapUser: e.target.value })} disabled={!canManage} /></Field>
            <Field label="IMAP Password"><Input type="password" value={em.imapPassword || ''} onChange={(e) => setEm({ ...em, imapPassword: e.target.value })} disabled={!canManage} /></Field>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <div className="text-xs text-zinc-500">All credentials stored server-side. Database integration row holds masked values for display.</div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload</Button>
                <Button size="sm" onClick={saveEmail} disabled={saving}><Save className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meta Conversions API */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" /> Meta Conversions API (CAPI)</CardTitle>
            {metaStatus === 'CONNECTED'
              ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Connected</Badge>
              : <Badge variant="outline" className="text-zinc-500">NOT CONNECTED</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Access Token">
              <Input type="password" value={meta.accessToken || ''} onChange={(e) => setMeta({ ...meta, accessToken: e.target.value })} placeholder="EAAG…" disabled={!canManage} />
            </Field>
            <Field label="Pixel ID">
              <Input value={meta.pixelId || ''} onChange={(e) => setMeta({ ...meta, pixelId: e.target.value })} placeholder="123456789012345" disabled={!canManage} />
            </Field>
            <Field label="API Version">
              <Input value={meta.apiVersion || 'v21.0'} onChange={(e) => setMeta({ ...meta, apiVersion: e.target.value })} disabled={!canManage} />
            </Field>
            <Field label="Test Event Code (optional)">
              <Input value={meta.testEventCode || ''} onChange={(e) => setMeta({ ...meta, testEventCode: e.target.value })} placeholder="TEST12345" disabled={!canManage} />
            </Field>
          </div>
          <div className="text-xs text-zinc-500 pt-2 space-y-1">
            <div>Sends <code className="bg-zinc-100 px-1.5 py-0.5 rounded">Lead</code>, <code className="bg-zinc-100 px-1.5 py-0.5 rounded">Contact</code>, and other CAPI events to Meta for ad attribution.</div>
            <div>PII (email, phone, name, city) is SHA-256 hashed before sending, per Meta spec.</div>
            <div>Endpoint: <code className="bg-zinc-100 px-1.5 py-0.5 rounded">POST https://graph.facebook.com/{`{apiVersion}`}/{`{pixelId}`}/events</code></div>
            <div>When enabled, a <strong>Fire CAPI</strong> button appears on each Lead row, and Lead events auto-fire when a lead's status becomes <code className="bg-zinc-100 px-1.5 py-0.5 rounded">CONVERTED</code>.</div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <a href="https://developers.facebook.com/docs/marketing-api/conversions-api" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
              Conversions API docs <ExternalLink className="w-3 h-3" />
            </a>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload</Button>
                <Button size="sm" onClick={saveMeta} disabled={saving}><Save className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
