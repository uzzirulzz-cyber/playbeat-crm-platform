import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES, hashPassword } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const { id } = await params()
  const u = await db.user.findUnique({ where: { id } })
  if (!u) return notFound('User not found')
  return ok({ user: { ...u, password: undefined } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const { id } = await params()
    const body = await req.json()
    const update: any = {}
    if (body.name !== undefined) update.name = String(body.name)
    if (body.role !== undefined) update.role = String(body.role).toUpperCase()
    if (body.active !== undefined) update.active = !!body.active
    if (body.password) update.password = await hashPassword(String(body.password))
    const u = await db.user.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'USER_UPDATE', entity: 'User', entityId: id, req })
    return ok({ user: { ...u, password: undefined } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.SUPER_ADMIN)) return forbiddenResponse()
  const { id } = await params()
  if (id === user.id) return Response.json({ error: 'Cannot delete self' }, { status: 400 })
  await db.user.delete({ where: { id } })
  await writeAuditLog({ user, action: 'USER_DELETE', entity: 'User', entityId: id, req })
  return ok({ success: true })
}
