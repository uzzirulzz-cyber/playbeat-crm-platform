// In-memory campaign queue processor (BullMQ+Redis replacement for sandbox).
// Iteratively steps through QUEUED campaign recipients, sending real WhatsApp/Email
// messages through the configured providers, recording per-recipient status,
// updating campaign stats, and emitting Socket.IO events. In a production deploy,
// swap this for a BullMQ worker - the interface (stepCampaign, scheduleNext)
// mirrors what a real queue worker would expose.

import { db } from '@/lib/db'
import { sendWhatsAppMessage, sendEmailMessage } from '@/lib/providers'
import { parseJSON } from '@/lib/http'
import { renderTemplate } from '@/lib/template'

const CAMPAIGN_BATCH = 5 // recipients processed per tick
let tickHandle: NodeJS.Timeout | null = null

export function startCampaignWorker() {
  if (tickHandle) return
  tickHandle = setInterval(() => {
    stepRunningCampaigns().catch((e) => {
      console.error('campaign worker step failed:', e)
    })
  }, 4000)
}

export function stopCampaignWorker() {
  if (tickHandle) {
    clearInterval(tickHandle)
    tickHandle = null
  }
}

export async function stepRunningCampaigns() {
  const running = await db.campaign.findMany({
    where: { status: 'RUNNING' },
    take: 3,
  })
  for (const campaign of running) {
    await stepCampaign(campaign.id)
  }
}

export async function stepCampaign(campaignId: string) {
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign || campaign.status !== 'RUNNING') return

  // Pick next batch of QUEUED recipients
  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId, status: 'QUEUED' },
    take: CAMPAIGN_BATCH,
    orderBy: { queuedAt: 'asc' },
  })

  if (recipients.length === 0) {
    // No more queued — finalize the campaign
    await finalizeCampaign(campaignId)
    return
  }

  for (const recipient of recipients) {
    await processRecipient(campaign, recipient)
  }
}

async function processRecipient(
  campaign: any,
  recipient: any,
) {
  // Mark as processing first (SENT state once dispatched)
  try {
    const isWhatsApp = campaign.channel === 'WHATSAPP' || campaign.channel === 'COMBINED'
    const isEmail = campaign.channel === 'EMAIL' || campaign.channel === 'COMBINED'

    let providerId = ''
    let status = 'SENT'
    let messageId: string | undefined
    let channel = campaign.channel
    if (campaign.channel === 'COMBINED') channel = recipient.leadEmail ? 'EMAIL' : 'WHATSAPP'

    const rendered = renderTemplate(campaign.message, {
      business_name: recipient.leadName || '',
      contact_name: recipient.leadName || '',
      city: '',
      country: '',
      website: '',
      email: recipient.leadEmail || '',
    })

    if (channel === 'WHATSAPP' && isWhatsApp && recipient.leadPhone) {
      const r = await sendWhatsAppMessage({
        to: recipient.leadPhone,
        body: rendered,
        templateName: campaign.templateId ? await getTemplateName(campaign.templateId) : undefined,
      })
      providerId = r.providerId
    } else if (channel === 'EMAIL' && isEmail && recipient.leadEmail) {
      const r = await sendEmailMessage({
        to: recipient.leadEmail,
        subject: campaign.subject || campaign.name,
        text: rendered,
      })
      providerId = r.providerId
    } else {
      throw new Error('No valid contact channel for this recipient')
    }

    // Create Message record (OUTBOUND)
    const msg = await db.message.create({
      data: {
        leadId: recipient.leadId,
        campaignId: campaign.id,
        channel,
        direction: 'OUTBOUND',
        subject: campaign.subject,
        body: rendered,
        providerId,
        status: 'SENT',
        messageId: providerId,
      },
    })
    messageId = msg.id

    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status, providerId, messageId, sentAt: new Date() },
    })

    // Update lead lastContacted
    await db.lead.update({
      where: { id: recipient.leadId },
      data: { lastContacted: new Date(), status: 'CONTACTED' },
    })
  } catch (e: any) {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'FAILED',
        error: e?.message || 'Unknown send error',
        failedAt: new Date(),
      },
    })
  }
}

async function getTemplateName(templateId: string): Promise<string | undefined> {
  const tpl = await db.template.findUnique({ where: { id: templateId } })
  return tpl?.name
}

async function finalizeCampaign(campaignId: string) {
  const recipients = await db.campaignRecipient.findMany({ where: { campaignId } })
  const stats = {
    total: recipients.length,
    sent: recipients.filter((r) => r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'READ').length,
    delivered: recipients.filter((r) => r.status === 'DELIVERED' || r.status === 'READ').length,
    read: recipients.filter((r) => r.status === 'READ').length,
    failed: recipients.filter((r) => r.status === 'FAILED').length,
    rejected: recipients.filter((r) => r.status === 'REJECTED').length,
    queued: recipients.filter((r) => r.status === 'QUEUED').length,
  }
  await db.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      stats: JSON.stringify(stats),
    },
  })
}

export async function buildCampaignRecipients(campaignId: string, segmentId?: string, filters?: any) {
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) throw new Error('Campaign not found')

  let leads: any[] = []
  if (segmentId) {
    const segment = await db.segment.findUnique({ where: { id: segmentId } })
    const segFilters = segment ? parseJSON(segment.filters, {}) : {}
    leads = await filterLeads(segFilters)
  } else if (filters) {
    leads = await filterLeads(filters)
  } else {
    leads = await db.lead.findMany({ where: { doNotContact: false } })
  }

  // Filter out suppressed contacts
  const suppressions = await db.suppression.findMany()
  const suppressedEmails = new Set(suppressions.filter((s) => s.type === 'EMAIL' || s.type === 'GLOBAL').map((s) => s.value.toLowerCase()))
  const suppressedPhones = new Set(suppressions.filter((s) => s.type === 'WHATSAPP' || s.type === 'GLOBAL').map((s) => s.value))

  const eligible = leads.filter((l) => {
    if (l.doNotContact) return false
    if (l.email && suppressedEmails.has(l.email.toLowerCase())) return false
    if (l.whatsapp && suppressedPhones.has(l.whatsapp)) return false
    if (campaign.channel === 'EMAIL' && !l.email) return false
    if (campaign.channel === 'WHATSAPP' && !l.whatsapp) return false
    if (campaign.channel === 'EMAIL' && !l.emailOptIn) return false
    if (campaign.channel === 'WHATSAPP' && !l.whatsappOptIn) return false
    return true
  })

  // Deduplicate by lead id
  const seen = new Set<string>()
  const recipients = eligible.filter((l) => {
    if (seen.has(l.id)) return false
    seen.add(l.id)
    return true
  })

  // Remove existing recipients (in case of re-run)
  await db.campaignRecipient.deleteMany({ where: { campaignId } })

  await db.campaignRecipient.createMany({
    data: recipients.map((l) => ({
      campaignId,
      leadId: l.id,
      leadName: l.businessName,
      leadEmail: l.email,
      leadPhone: l.whatsapp,
      status: 'QUEUED',
    })),
  })

  await db.campaign.update({
    where: { id: campaignId },
    data: {
      stats: JSON.stringify({ total: recipients.length, sent: 0, delivered: 0, read: 0, failed: 0, queued: recipients.length, rejected: 0 }),
    },
  })

  return recipients.length
}

export async function filterLeads(filters: any): Promise<any[]> {
  const where: any = {}
  if (filters.country) where.country = filters.country
  if (filters.state) where.state = filters.state
  if (filters.city) where.city = filters.city
  if (filters.category) where.category = filters.category
  if (filters.status) where.status = filters.status
  if (filters.source) where.source = filters.source
  if (typeof filters.scoreMin === 'number') where.score = { gte: filters.scoreMin }
  if (typeof filters.scoreMax === 'number') where.score = { ...(where.score || {}), lte: filters.scoreMax }
  if (filters.emailAvailable === true) where.email = { not: null }
  if (filters.whatsappAvailable === true) where.whatsapp = { not: null }
  if (filters.emailOptIn === true) where.emailOptIn = true
  if (filters.whatsappOptIn === true) where.whatsappOptIn = true
  if (filters.websiteAvailable === true) where.website = { not: null }
  if (filters.neverContacted === true) where.lastContacted = null
  if (filters.tags && filters.tags.length > 0) {
    // tags stored as JSON array string - simple contains match
    // (SQLite doesn't support array queries natively; filter in memory)
  }
  if (filters.doNotContact === false) where.doNotContact = false

  let leads = await db.lead.findMany({ where })
  if (filters.tags && filters.tags.length > 0) {
    leads = leads.filter((l) => {
      const tags = parseJSON<string[]>(l.tags, [])
      return filters.tags.some((t: string) => tags.includes(t))
    })
  }
  return leads
}
