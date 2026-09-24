'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Radio, ShieldCheck, Send, Mail } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'

export default function LoginView() {
  const setUser = useConsole((s) => s.setUser)
  const [email, setEmail] = useState('admin@playbeat.digital')
  const [password, setPassword] = useState('playbeat1122')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const r = await api<{ user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(r.user)
    } catch (e: any) {
      setErr(e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <Send className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">LeadPulse</h1>
            <p className="text-sm text-zinc-400">Lead Broadcasting & Communication Console</p>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Sign in</CardTitle>
            <CardDescription className="text-zinc-400">
              Use your admin credentials to access the console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-zinc-950 border-zinc-800 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-zinc-950 border-zinc-800 text-white"
                  required
                />
              </div>
              {err && <p className="text-sm text-red-400">{err}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-4 p-3 rounded-md bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="font-mono">admin@playbeat.digital / playbeat1122</div>
              <div>Default seeded credentials. Change password after first login.</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> JWT auth</div>
          <div className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Role-based access</div>
          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Real SMTP/WhatsApp</div>
        </div>
      </div>
    </div>
  )
}
