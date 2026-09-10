import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'
import { buildCampaignRecipients } from '@/lib/campaign-worker'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const { id } = await params()
    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return notFound('Campaign not found')

    const count = await buildCampaignRecipients(id, campaign.segmentId || undefined)
    await db.campaign.update({ where: { id }, data: { status: 'RUNNING', startedAt: new Date() } })
    await writeAuditLog({ user, action: 'CAMPAIGN_START', entity: 'Campaign', entityId: id, details: `${count} recipients`, req })
    return ok({ status: 'RUNNING', recipients: count })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
