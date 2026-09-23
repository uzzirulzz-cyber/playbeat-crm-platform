import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { fireLeadEventForLead, getMetaCAPIStatus } from '@/lib/meta-capi'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const params: any = (ctx as any).params
  const id = typeof params?.then === 'function' ? (await params).id : params.id
  const lead = await db.lead.findUnique({ where: { id } })
  if (!lead) return notFound('Lead not found')
  return ok({ lead: { ...lead, tags: parseJSON<string[]>(lead.tags, []) } })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.AGENT)) return forbiddenResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return notFound('Lead not found')

    const update: any = {}
    for (const k of ['businessName','contactPerson','email','whatsapp','country','state','city','category','website','source','notes','status']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.tags !== undefined) update.tags = JSON.stringify(body.tags)
    if (body.score !== undefined) update.score = Number(body.score)
    for (const k of ['emailVerified','whatsappAvailable','emailOptIn','whatsappOptIn','doNotContact']) {
      if (body[k] !== undefined) update[k] = !!body[k]
    }
    update.updatedAt = new Date()

    const lead = await db.lead.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'LEAD_UPDATE', entity: 'Lead', entityId: id, req })

    // Meta CAPI auto-fire hooks (all gated by individual settings, all best-effort)
    const capiConnected = (await getMetaCAPIStatus()) === 'CONNECTED'
    if (capiConnected) {
      const getSetting = async (key: string, def: string) => {
        const s = await db.setting.findUnique({ where: { key } })
        return s ? s.value : def
      }

      // 1. Lead event: when status transitions to CONVERTED
      const wasConverted = existing.status !== 'CONVERTED'
      const isNowConverted = body.status === 'CONVERTED'
      if (wasConverted && isNowConverted && await getSetting('meta_capi.autoFireOnConverted', 'true') !== 'false') {
        await tryAutoFire(lead, 'Lead', 'on CONVERTED', user, id, req)
      }

      // 2. Contact event: when status transitions to REPLIED
      const wasReplied = existing.status !== 'REPLIED'
      const isNowReplied = body.status === 'REPLIED'
      if (wasReplied && isNowReplied && await getSetting('meta_capi.autoFireOnReplied', 'true') !== 'false') {
        await tryAutoFire(lead, 'Contact', 'on REPLIED', user, id, req)
      }

      // 3. Subscribe event: when a lead newly opts into email or WhatsApp marketing
      const emailOptInChanged = body.emailOptIn === true && existing.emailOptIn === false
      const whatsappOptInChanged = body.whatsappOptIn === true && existing.whatsappOptIn === false
      if ((emailOptInChanged || whatsappOptInChanged) && await getSetting('meta_capi.autoFireOnOptIn', 'true') !== 'false') {
        await tryAutoFire(lead, 'Subscribe', 'on opt-in', user, id, req)
      }

      // 4. StartTrial event: when status transitions to QUALIFIED (default: off — opt-in setting)
      const wasQualified = existing.status !== 'QUALIFIED'
      const isNowQualified = body.status === 'QUALIFIED'
      if (wasQualified && isNowQualified && await getSetting('meta_capi.autoFireOnQualified', 'false') === 'true') {
        await tryAutoFire(lead, 'StartTrial', 'on QUALIFIED', user, id, req)
      }
    }

    return ok({ lead: { ...lead, tags: parseJSON<string[]>(lead.tags, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Update failed')
  }
}

/** Best-effort Meta CAPI auto-fire. Never throws — logs success or failure to audit log. */
async function tryAutoFire(
  lead: any,
  eventName: string,
  trigger: string,
  user: any,
  leadId: string,
  req: NextRequest,
) {
  try {
    const result = await fireLeadEventForLead(lead, eventName)
    await writeAuditLog({
      user,
      action: 'META_CAPI_AUTO_FIRE',
      entity: 'Lead',
      entityId: leadId,
      details: `Auto-fired ${eventName} event ${trigger} (ok=${result.ok}, events_received=${result.metaResponse?.events_received ?? '—'}, fbtrace=${result.metaResponse?.fbtrace_id ?? '—'})`,
      req,
    })
  } catch (e: any) {
    await writeAuditLog({
      user,
      action: 'META_CAPI_AUTO_FIRE_FAILED',
      entity: 'Lead',
      entityId: leadId,
      details: `${eventName} ${trigger}: ${e?.message || 'Unknown CAPI error'}`,
      req,
    })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    await db.lead.delete({ where: { id } })
    await writeAuditLog({ user, action: 'LEAD_DELETE', entity: 'Lead', entityId: id, req })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Delete failed')
  }
}
