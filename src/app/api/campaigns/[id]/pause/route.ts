import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const params: any = (ctx as any).params; const id = typeof params?.then === 'function' ? (await params).id : params.id
    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return notFound('Campaign not found')
    await db.campaign.update({ where: { id }, data: { status: 'PAUSED' } })
    await writeAuditLog({ user, action: 'CAMPAIGN_PAUSE', entity: 'Campaign', entityId: id, req })
    return ok({ status: 'PAUSED' })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
