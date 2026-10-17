import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { buildCampaignRecipients, startCampaignWorker } from '@/lib/campaign-worker'

// Module-level side effect: start the tick loop for every known account.
// 'default' = the main clinic WhatsApp number; 'jungleofdestiny' = the second
// number/worker for jungleofdestiny.shop. Add more account keys here as more
// WhatsApp numbers get connected.
startCampaignWorker('default')
startCampaignWorker('jungleofdestiny')

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok({
    campaigns: campaigns.map((c) => ({
      ...c,
      stats: parseJSON(c.stats, {}),
      attachments: parseJSON(c.attachments, []),
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    if (!name) return badRequest('Campaign name required')
    const channel = String(body.channel || 'EMAIL').toUpperCase()
    if (!['EMAIL', 'WHATSAPP', 'COMBINED'].includes(channel)) return badRequest('Invalid channel')
    // Which WhatsApp/Email account this campaign sends from, e.g. "default"
    // (main clinic number) or "jungleofdestiny" (second site's number).
    const account = String(body.account || 'default')

    const campaign = await db.campaign.create({
      data: {
        name,
        account,
        channel,
        segmentId: body.segmentId || null,
        segmentName: body.segmentName || null,
        subject: body.subject || null,
        message: body.message || '',
        templateId: body.templateId || null,
        attachments: JSON.stringify(body.attachments || []),
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: body.status || 'DRAFT',
        createdBy: user.id,
        createdByName: user.name,
      },
    })
    await writeAuditLog({ user, action: 'CAMPAIGN_CREATE', entity: 'Campaign', entityId: campaign.id, details: name, req })
    return ok({
      campaign: {
        ...campaign,
        stats: parseJSON(campaign.stats, {}),
        attachments: parseJSON(campaign.attachments, []),
      },
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const body = await req.json()
    const id = body.id
    if (!id) return badRequest('id required')
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
