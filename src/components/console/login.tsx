'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, Phone, MessageCircle, Users } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center p-4 pb-gradient-charcoal">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl pb-gradient-purple shadow-lg shadow-purple-900/50">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">PlayBeat CRM</h1>
            <p className="text-sm text-purple-300/80 mt-1">One workspace. Every customer conversation.</p>
          </div>
        </div>

        <Card className="border-purple-900/50 bg-zinc-900/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Sign in to your workspace</CardTitle>
            <CardDescription className="text-zinc-400">
              Use your employee credentials to access the CRM.
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
                  className="bg-zinc-950 border-purple-900/50 text-white focus:border-purple-500"
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
                  className="bg-zinc-950 border-purple-900/50 text-white focus:border-purple-500"
                  required
                />
              </div>
              {err && <p className="text-sm text-red-400">{err}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full pb-gradient-purple hover:opacity-90 text-white font-semibold border-0"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-4 p-3 rounded-md bg-zinc-950/60 border border-purple-900/30 text-xs text-zinc-400 space-y-1">
              <div className="font-mono text-purple-300">admin@playbeat.digital / playbeat1122</div>
              <div>Default seeded credentials. Change password after first login.</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-5 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-purple-400" /> WhatsApp</div>
          <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-purple-400" /> Phone Dialer</div>
          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-purple-400" /> CRM</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> RBAC</div>
        </div>
      </div>
    </div>
  )
}
