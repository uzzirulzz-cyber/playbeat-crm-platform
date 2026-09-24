// Followup by id: PUT (update status, reschedule) + DELETE
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    for (const k of ['status','notes','channel']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.scheduledAt !== undefined) update.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    const followup = await db.followup.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'FOLLOWUP_UPDATED', entity: 'Followup', entityId: id, details: `status=${followup.status}`, req })
    return ok({ followup })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    await db.followup.delete({ where: { id } })
    await writeAuditLog({ user, action: 'FOLLOWUP_DELETED', entity: 'Followup', entityId: id, req })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
