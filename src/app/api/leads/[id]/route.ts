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

    // Auto-fire Meta CAPI Lead event when lead status transitions to CONVERTED
    const wasConverted = existing.status !== 'CONVERTED'
    const isNowConverted = body.status === 'CONVERTED'
    if (wasConverted && isNowConverted) {
      try {
        const status = await getMetaCAPIStatus()
        if (status === 'CONNECTED') {
          // Check setting to confirm auto-fire is enabled (default: enabled)
          const setting = await db.setting.findUnique({ where: { key: 'meta_capi.autoFireOnConverted' } })
          const autoFire = setting ? setting.value !== 'false' : true
          if (autoFire) {
            const result = await fireLeadEventForLead(lead, 'Lead')
            await writeAuditLog({
              user,
              action: 'META_CAPI_AUTO_FIRE',
              entity: 'Lead',
              entityId: id,
              details: `Auto-fired Lead event on CONVERTED (ok=${result.ok}, providerId=${result.providerId || '—'})`,
              req,
            })
          }
        }
      } catch (e: any) {
        // Don't fail the lead update if CAPI fails — just log
        await writeAuditLog({
          user,
          action: 'META_CAPI_AUTO_FIRE_FAILED',
          entity: 'Lead',
          entityId: id,
          details: e?.message || 'Unknown CAPI error',
          req,
        })
      }
    }

    return ok({ lead: { ...lead, tags: parseJSON<string[]>(lead.tags, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Update failed')
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
