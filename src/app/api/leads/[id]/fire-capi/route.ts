// Convenience: fire CAPI event for a single lead by id (path-param version).
// Body: {
//   eventName?: string (default "Lead")
//   eventId?: string (for deduplication)
//   objectProperties?: Record<string, any>
// }
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError, badRequest } from '@/lib/http'
import { fireLeadEventForLead, getMetaCAPIStatus, isStandardEvent, validateObjectProperties } from '@/lib/meta-capi'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id

    const body = await req.json().catch(() => ({}))
    const eventName = String(body.eventName || 'Lead')
    const eventId = body.eventId ? String(body.eventId) : undefined
    const objectProperties = body.objectProperties || {}

    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead not found')

    const status = await getMetaCAPIStatus()
    if (status === 'DISCONNECTED') {
      return badRequest('Meta CAPI NOT CONNECTED. Configure Access Token and Pixel ID in Integrations first.')
    }

    if (isStandardEvent(eventName)) {
      const errors = validateObjectProperties(eventName, objectProperties)
      if (errors.length > 0) {
        return badRequest(`Validation failed: ${errors.join('; ')}`)
      }
    }

    const result = await fireLeadEventForLead(lead, eventName, objectProperties, eventId)

    // Always write an audit entry — success or failure (failures are useful for debugging)
    await writeAuditLog({
      user,
      action: result.ok ? 'META_CAPI_FIRE' : 'META_CAPI_FIRE_FAILED',
      entity: 'Lead',
      entityId: lead.id,
      details: result.ok
        ? `${eventName} event → Meta pixel (events_received: ${result.metaResponse?.events_received ?? 0}, fbtrace_id: ${result.metaResponse?.fbtrace_id ?? '—'})`
        : `${eventName} event FAILED: ${result.error}`,
      req,
    })

    if (!result.ok) {
      return serverError(`Meta CAPI send failed: ${result.error}`)
    }

    return ok({
      ok: true,
      leadId: lead.id,
      eventName,
      eventId,
      eventsReceived: result.metaResponse?.events_received,
      messages: result.metaResponse?.messages,
      fbtraceId: result.metaResponse?.fbtrace_id,
      payload: result.payload,
      metaResponse: result.metaResponse,
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
