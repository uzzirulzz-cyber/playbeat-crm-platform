// End a call: POST /api/calls/:id/end  body: { outcome?, notes?, nextFollowupAt? }
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError } from '@/lib/http'
import { endCall } from '@/lib/telephony'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json().catch(() => ({}))
    const nextFollowupAt = body.nextFollowupAt ? new Date(body.nextFollowupAt) : undefined
    const result = await endCall(id, body.outcome, body.notes, nextFollowupAt)
    if (!result.ok) return serverError(result.error || 'Failed to end call')

    const call = await db.call.findUnique({ where: { id } })
    await writeAuditLog({
      user,
      action: 'CALL_ENDED',
      entity: 'Call',
      entityId: id,
      details: `Duration: ${call?.durationSec || 0}s, outcome: ${body.outcome || '—'}`,
      req,
    })
    return ok({ call })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
