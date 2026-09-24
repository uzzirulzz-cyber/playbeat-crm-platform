// Single call: GET / PATCH (update outcome, status)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const params: any = (ctx as any).params
  const id = typeof params?.then === 'function' ? (await params).id : params.id
  const call = await db.call.findUnique({ where: { id } })
  if (!call) return notFound('Call not found')
  return ok({ call })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    for (const k of ['status','outcome','outcomeNotes','nextFollowupAt','recordingUrl']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.nextFollowupAt) update.nextFollowupAt = new Date(body.nextFollowupAt)
    const call = await db.call.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'CALL_UPDATED', entity: 'Call', entityId: id, details: `Status: ${call.status}, outcome: ${call.outcome || '—'}`, req })
    return ok({ call })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
