// Note by id: PUT (edit) + DELETE
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError } from '@/lib/http'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    if (body.body !== undefined) update.body = String(body.body)
    if (body.pinned !== undefined) update.pinned = !!body.pinned
    const note = await db.note.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'NOTE_UPDATED', entity: 'Note', entityId: id, req })
    return ok({ note })
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
    await db.note.delete({ where: { id } })
    await writeAuditLog({ user, action: 'NOTE_DELETED', entity: 'Note', entityId: id, req })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
