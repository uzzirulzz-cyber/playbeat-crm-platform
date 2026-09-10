'use client'

import { useEffect, useState } from 'react'
import { useConsole } from '@/lib/console-store'
import { api } from '@/lib/api-client'
import LoginView from '@/components/console/login'
import ConsoleShell from '@/components/console/shell'

export default function Home() {
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
  }, [])

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-sm">Loading console…</div>
      </div>
    )
  }

  return user ? <ConsoleShell /> : <LoginView />
}
