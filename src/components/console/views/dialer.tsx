'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, MessageCircle, Delete, User, PhoneCall, X, Mic, MicOff, Volume2, VolumeX, Pause, Square } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const KEYS = [
  { d: '1', sub: '' },
  { d: '2', sub: 'ABC' },
  { d: '3', sub: 'DEF' },
  { d: '4', sub: 'GHI' },
  { d: '5', sub: 'JKL' },
  { d: '6', sub: 'MNO' },
  { d: '7', sub: 'PQRS' },
  { d: '8', sub: 'TUV' },
  { d: '9', sub: 'WXYZ' },
  { d: '*', sub: '' },
  { d: '0', sub: '+' },
  { d: '#', sub: '' },
]

const COUNTRIES = [
  { code: '+1', label: '🇺🇸 US/CA' },
  { code: '+44', label: '🇬🇧 UK' },
  { code: '+92', label: '🇵🇰 Pakistan' },
  { code: '+971', label: '🇦🇪 UAE' },
  { code: '+91', label: '🇮🇳 India' },
  { code: '+966', label: '🇸🇦 KSA' },
  { code: '+61', label: '🇦🇺 Australia' },
  { code: '+49', label: '🇩🇪 Germany' },
]

const OUTCOMES = ['CONNECTED', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'CALL_BACK', 'INTERESTED', 'NOT_INTERESTED', 'QUALIFIED', 'FOLLOW_UP_REQUIRED']

export default function DialerView() {
  const { connectionStatus, setView } = useConsole()
  const [number, setNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+1')
  const [recentContacts, setRecentContacts] = useState<any[]>([])
  const [call, setCall] = useState<any | null>(null)
  const [callTimer, setCallTimer] = useState(0)
  const [callStatus, setCallStatus] = useState<'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED'>('IDLE')
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [onHold, setOnHold] = useState(false)
  const [outcomeDialog, setOutcomeDialog] = useState<any | null>(null)
  const [outcomeForm, setOutcomeForm] = useState({ outcome: '', notes: '', nextFollowupAt: '' })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load recent contacts (leads with phone numbers)
    api<{ leads: any[] }>('/api/leads?pageSize=20').then((r) => {
      setRecentContacts((r.leads || []).filter((l) => l.whatsapp || l.phone))
    }).catch(() => {})
  }, [])

  // Tick the call timer
  useEffect(() => {
    if (callStatus === 'CONNECTED') {
      timerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000) as any
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callStatus])

  // Poll call status
  useEffect(() => {
    if (!call?.id || callStatus === 'IDLE' || callStatus === 'ENDED') return
    const t = setInterval(async () => {
      try {
        const r = await api<{ call: any }>(`/api/calls/${call.id}`)
        if (r.call.status === 'RINGING' && callStatus === 'CALLING') setCallStatus('RINGING')
        if (r.call.status === 'CONNECTED' && callStatus !== 'CONNECTED') {
          setCallStatus('CONNECTED')
          setCallTimer(0)
        }
        if (r.call.status === 'ENDED' && callStatus !== 'ENDED') {
          setCallStatus('ENDED')
          setTimeout(() => setOutcomeDialog(r.call), 500)
        }
      } catch {}
    }, 1000)
    return () => clearInterval(t)
  }, [call?.id, callStatus])

  function pressKey(d: string) {
    setNumber((n) => n + d)
  }

  function backspace() {
    setNumber((n) => n.slice(0, -1))
  }

  function formatNumber(n: string): string {
    // Strip everything except digits and +
    let clean = n.replace(/[^\d+]/g, '')
    if (!clean.startsWith('+') && countryCode) clean = countryCode + clean
    return clean
  }

  async function startCall() {
    const to = formatNumber(number)
    if (!to) { toast.error('Enter a phone number first'); return }
    if (connectionStatus.telephony !== 'CONNECTED') {
      toast.error('Telephony provider not configured. Set TELEPHONY_PROVIDER=mock for local testing, or configure Twilio/Vonage in Integrations.')
      return
    }
    setCallStatus('CALLING')
    setCallTimer(0)
    try {
      const r = await api<{ callId: string; provider: string }>('/api/calls', {
        method: 'POST',
        body: JSON.stringify({ to }),
      })
      const r2 = await api<{ call: any }>(`/api/calls/${r.callId}`)
      setCall(r2.call)
      toast.success(`Call initiated via ${r.provider}`)
    } catch (e: any) {
      toast.error(e.message)
      setCallStatus('IDLE')
    }
  }

  async function endCall() {
    if (!call?.id) return
    try {
      const r = await api<{ call: any }>(`/api/calls/${call.id}/end`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setCallStatus('ENDED')
      setTimeout(() => setOutcomeDialog(r.call), 500)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function saveOutcome() {
    if (!outcomeDialog?.id) return
    try {
      await api(`/api/calls/${outcomeDialog.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          outcome: outcomeForm.outcome || null,
          outcomeNotes: outcomeForm.notes || null,
          nextFollowupAt: outcomeForm.nextFollowupAt || null,
        }),
      })
      toast.success('Call outcome saved')
      setOutcomeDialog(null)
      setOutcomeForm({ outcome: '', notes: '', nextFollowupAt: '' })
      setCall(null)
      setCallStatus('IDLE')
      setCallTimer(0)
    } catch (e: any) { toast.error(e.message) }
  }

  function callContact(c: any) {
    const phone = c.whatsapp || c.phone || ''
    if (!phone) { toast.error('No phone number for this contact'); return }
    setNumber(phone)
  }

  return (
    <div className="h-full flex">
      {/* Dialer panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-gradient-charcoal">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl pb-gradient-purple shadow-lg shadow-purple-900/50 mb-2">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Phone Dialer</h1>
            <p className="text-xs text-purple-300/70">
              {connectionStatus.telephony === 'CONNECTED' ? 'Telephony connected' : 'Telephony not configured'}
            </p>
          </div>

          {/* Number input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-32 bg-zinc-900 border-purple-900/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label} {c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Enter phone number"
                className="flex-1 bg-zinc-900 border-purple-900/50 text-white text-lg font-mono text-center"
              />
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map((k) => (
              <button
                key={k.d}
                onClick={() => pressKey(k.d)}
                className="pb-key h-16 rounded-xl flex flex-col items-center justify-center text-white"
              >
                <span className="text-2xl font-semibold">{k.d}</span>
                {k.sub && <span className="text-[10px] text-purple-200/70 tracking-wider">{k.sub}</span>}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-4 gap-2.5">
            <button
              onClick={() => setView('leads')}
              className="h-12 rounded-xl bg-zinc-800/60 border border-purple-900/30 flex items-center justify-center text-purple-200 hover:bg-zinc-800 transition-colors"
              title="Contacts"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={startCall}
              disabled={callStatus !== 'IDLE'}
              className={cn(
                'h-12 rounded-xl flex items-center justify-center text-white font-medium transition-all',
                callStatus !== 'IDLE' ? 'bg-zinc-700 opacity-50' : 'pb-gradient-purple hover:opacity-90 shadow-lg shadow-purple-900/50'
              )}
              title="Call"
            >
              <PhoneCall className="w-5 h-5 mr-1.5" />
              <span className="text-sm">Call</span>
            </button>
            <button
              onClick={() => { if (number) setView('whatsapp') }}
              className="h-12 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
              title="Message"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={backspace}
              className="h-12 rounded-xl bg-zinc-800/60 border border-purple-900/30 flex items-center justify-center text-purple-200 hover:bg-zinc-800 transition-colors"
              title="Delete"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel - recent contacts */}
      <div className="hidden lg:flex w-80 flex-col border-l border-purple-900/30 bg-zinc-900/50">
        <div className="p-4 border-b border-purple-900/30">
          <h3 className="text-sm font-semibold text-white">Recent contacts</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll">
          {recentContacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-purple-300/60">No contacts with phone numbers yet.</div>
          ) : (
            recentContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => callContact(c)}
                className="w-full text-left px-4 py-2.5 border-b border-purple-900/20 hover:bg-purple-900/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full pb-gradient-purple flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {(c.businessName || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{c.businessName}</div>
                    <div className="text-xs text-purple-300/70 truncate font-mono">{c.whatsapp || c.phone || '—'}</div>
                  </div>
                  <PhoneCall className="w-3.5 h-3.5 text-purple-300" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Active call dialog */}
      {call && callStatus !== 'IDLE' && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="max-w-md pb-gradient-charcoal border-purple-900/50">
            <DialogHeader>
              <DialogTitle className="text-white text-center">Active Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-center">
              <div className="w-20 h-20 mx-auto rounded-full pb-gradient-purple flex items-center justify-center text-2xl font-bold text-white">
                {(call.leadName || call.phone || '?').charAt(0)}
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{call.leadName || 'Unknown'}</div>
                <div className="text-sm text-purple-300/70 font-mono">{call.phone}</div>
              </div>
              <div className="text-sm text-purple-300">
                {callStatus === 'CALLING' && 'Calling…'}
                {callStatus === 'RINGING' && 'Ringing…'}
                {callStatus === 'CONNECTED' && (
                  <span className="font-mono">{formatDuration(callTimer)}</span>
                )}
              </div>
              {callStatus === 'RINGING' && (
                <div className="text-xs text-purple-300/60 pb-pulse">Waiting for answer…</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3 pb-4">
              <CallControl icon={muted ? MicOff : Mic} label="Mute" active={muted} onClick={() => setMuted(!muted)} />
              <CallControl icon={speaker ? Volume2 : VolumeX} label="Speaker" active={speaker} onClick={() => setSpeaker(!speaker)} />
              <CallControl icon={Pause} label="Hold" active={onHold} onClick={() => setOnHold(!onHold)} />
              <CallControl icon={Square} label="End" danger onClick={endCall} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Call outcome dialog */}
      {outcomeDialog && (
        <Dialog open onOpenChange={() => setOutcomeDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Call Outcome</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-md bg-zinc-50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-zinc-500">Duration:</span><span className="font-mono">{formatDuration(outcomeDialog.durationSec || 0)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Contact:</span><span>{outcomeDialog.leadName || outcomeDialog.phone}</span></div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Outcome</Label>
                <Select value={outcomeForm.outcome} onValueChange={(v) => setOutcomeForm({ ...outcomeForm, outcome: v })}>
                  <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                  <SelectContent>
                    {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={outcomeForm.notes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Call notes…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Next follow-up (optional)</Label>
                <Input
                  type="datetime-local"
                  value={outcomeForm.nextFollowupAt}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, nextFollowupAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOutcomeDialog(null)}>Skip</Button>
              <Button onClick={saveOutcome}>Save Call Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CallControl({ icon: Icon, label, active, danger, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors',
        danger
          ? 'bg-red-600 hover:bg-red-700 border-red-700 text-white'
          : active
            ? 'bg-purple-600 border-purple-500 text-white'
            : 'bg-zinc-800 border-purple-900/30 text-purple-200 hover:bg-zinc-700'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
