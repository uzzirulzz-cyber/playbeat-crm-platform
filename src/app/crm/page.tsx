'use client'

import { useEffect, useState } from 'react'
import { useConsole } from '@/lib/console-store'
import { api } from '@/lib/api-client'
import ConsoleShell from '@/components/console/shell'
import LoginView from '@/components/console/login'

export default function CRMPage() {
  const { user, setUser } = useConsole()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await api<{ user: any }>('/api/me', {}).catch(() => null)
        if (r?.user) setUser(r.user)
      } catch {}
      setBooting(false)
    })()
  }, [setUser])

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-gradient-charcoal text-zinc-400">
        <div className="text-sm">Loading PlayBeat CRM…</div>
      </div>
    )
  }

  return user ? <ConsoleShell /> : <LoginView />
}
