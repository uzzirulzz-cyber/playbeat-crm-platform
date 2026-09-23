'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History } from 'lucide-react'
import { api } from '@/lib/api-client'

export default function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ logs: any[] }>('/api/audit-logs').then((r) => setLogs(r.logs || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><History className="w-5 h-5 text-zinc-500" /> Audit Logs</h1>
        <p className="text-sm text-zinc-500">Last 200 actions across users, leads, campaigns, and integrations.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Time</th>
                <th className="text-left font-medium px-3 py-2.5">User</th>
                <th className="text-left font-medium px-3 py-2.5">Action</th>
                <th className="text-left font-medium px-3 py-2.5">Entity</th>
                <th className="text-left font-medium px-3 py-2.5">Details</th>
                <th className="text-left font-medium px-3 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">No audit logs.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2.5">{l.userName || '—'}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{l.action}</Badge></td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.entity}{l.entityId ? ` (${l.entityId.slice(-6)})` : ''}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500 truncate max-w-md">{l.details || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{l.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
