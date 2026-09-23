// Fire a Meta Conversions API event for a specific lead.
// Body: { leadId: string, eventName?: string (default "Lead") }
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, serverError } from '@/lib/http'
import { fireLeadEventForLead, getMetaCAPIStatus } from '@/lib/meta-capi'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const leadId = String(body.leadId || '')
    const eventName = String(body.eventName || 'Lead')
    if (!leadId) return badRequest('leadId required')

    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) return notFound('Lead not found')

    const status = await getMetaCAPIStatus()
    if (status === 'DISCONNECTED') {
      return badRequest('Meta CAPI NOT CONNECTED. Configure Access Token and Pixel ID in Integrations first.')
    }

    const result = await fireLeadEventForLead(lead, eventName)
    if (!result.ok) {
      return serverError(`Meta CAPI send failed: ${result.error}`)
    }

    // Record an audit entry
    await writeAuditLog({
      user,
      action: 'META_CAPI_FIRE',
      entity: 'Lead',
      entityId: lead.id,
      details: `${eventName} event → Meta pixel (providerId: ${result.providerId})`,
      req,
    })

    return ok({
      ok: true,
      eventName,
      leadId: lead.id,
      providerId: result.providerId,
      payload: result.payload,
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
