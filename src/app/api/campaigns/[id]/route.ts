import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { buildCampaignRecipients } from '@/lib/campaign-worker'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const { id } = await params()
  const campaign = await db.campaign.findUnique({ where: { id } })
  if (!campaign) return notFound('Campaign not found')
  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: { queuedAt: 'asc' },
    take: 200,
  })
  return ok({
    campaign: {
      ...campaign,
      stats: parseJSON(campaign.stats, {}),
      attachments: parseJSON(campaign.attachments, []),
    },
    recipients,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const { id } = await params()
    const body = await req.json()
    const update: any = {}
    for (const k of ['name','channel','segmentId','segmentName','subject','message','templateId']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.attachments !== undefined) update.attachments = JSON.stringify(body.attachments)
    if (body.scheduledAt !== undefined) update.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    if (body.status !== undefined) update.status = body.status
    const c = await db.campaign.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'CAMPAIGN_UPDATE', entity: 'Campaign', entityId: id, req })
    return ok({
      campaign: {
        ...c,
        stats: parseJSON(c.stats, {}),
        attachments: parseJSON(c.attachments, []),
      },
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const { id } = await params()
  await db.campaignRecipient.deleteMany({ where: { campaignId: id } })
  await db.message.deleteMany({ where: { campaignId: id } })
  await db.campaign.delete({ where: { id } })
  await writeAuditLog({ user, action: 'CAMPAIGN_DELETE', entity: 'Campaign', entityId: id, req })
  return ok({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Used to start/pause/cancel via body.action
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const { id } = await params()
    const body = await req.json()
    const action = String(body.action || '')
    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return notFound('Campaign not found')

    if (action === 'start') {
      // Build recipients from segment
      const count = await buildCampaignRecipients(id, campaign.segmentId || undefined)
      await db.campaign.update({ where: { id }, data: { status: 'RUNNING', startedAt: new Date() } })
      await writeAuditLog({ user, action: 'CAMPAIGN_START', entity: 'Campaign', entityId: id, details: `${count} recipients`, req })
      return ok({ status: 'RUNNING', recipients: count })
    } else if (action === 'pause') {
      await db.campaign.update({ where: { id }, data: { status: 'PAUSED' } })
      await writeAuditLog({ user, action: 'CAMPAIGN_PAUSE', entity: 'Campaign', entityId: id, req })
      return ok({ status: 'PAUSED' })
    } else if (action === 'cancel') {
      await db.campaignRecipient.updateMany({ where: { campaignId: id, status: 'QUEUED' }, data: { status: 'REJECTED', error: 'Campaign cancelled' } })
      await db.campaign.update({ where: { id }, data: { status: 'CANCELLED' } })
      await writeAuditLog({ user, action: 'CAMPAIGN_CANCEL', entity: 'Campaign', entityId: id, req })
      return ok({ status: 'CANCELLED' })
    } else if (action === 'resume') {
      await db.campaign.update({ where: { id }, data: { status: 'RUNNING' } })
      await writeAuditLog({ user, action: 'CAMPAIGN_RESUME', entity: 'Campaign', entityId: id, req })
      return ok({ status: 'RUNNING' })
    }
    return badRequest('Unknown action')
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

function badRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 })
}
