import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const params: any = (ctx as any).params; const id = typeof params?.then === 'function' ? (await params).id : params.id
    await db.suppression.delete({ where: { id } })
    await writeAuditLog({ user, action: 'SUPPRESSION_REMOVE', entity: 'Suppression', entityId: id, req })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
