// Fire a Meta Conversions API event for a specific lead.
// Supports all 17 standard events + custom events, with object properties.
// Body: {
//   leadId: string (required)
//   eventName?: string (default "Lead"; any of the 17 Meta standard events or custom)
//   eventId?: string (for deduplication with Pixel fbq('track', ..., eventID))
//   objectProperties?: Record<string, any>  // content_ids, currency, value, etc.
//   actionSource?: string (default "system_generated")
// }
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, serverError } from '@/lib/http'
import { fireLeadEventForLead, getMetaCAPIStatus, isStandardEvent, getStandardEventSpec, validateObjectProperties, STANDARD_EVENTS, OBJECT_PROPERTIES } from '@/lib/meta-capi'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const leadId = String(body.leadId || '')
    const eventName = String(body.eventName || 'Lead')
    const eventId = body.eventId ? String(body.eventId) : undefined
    const actionSource = String(body.actionSource || 'system_generated')
    const objectProperties = body.objectProperties || {}

    if (!leadId) return badRequest('leadId required')

    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) return notFound('Lead not found')

    const status = await getMetaCAPIStatus()
    if (status === 'DISCONNECTED') {
      return badRequest('Meta CAPI NOT CONNECTED. Configure Access Token and Pixel ID in Integrations first.')
    }

    // Validate object properties for standard events
    if (isStandardEvent(eventName)) {
      const errors = validateObjectProperties(eventName, objectProperties)
      if (errors.length > 0) {
        return badRequest(`Validation failed: ${errors.join('; ')}`)
      }
    }

    const result = await fireLeadEventForLead(lead, eventName, objectProperties, eventId)

    // Always audit — success or failure
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
      eventName,
      leadId: lead.id,
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

// GET: list all standard events with their object property specs (for UI to render dynamic form)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  return ok({
    standardEvents: STANDARD_EVENTS,
    objectProperties: OBJECT_PROPERTIES,
  })
}
