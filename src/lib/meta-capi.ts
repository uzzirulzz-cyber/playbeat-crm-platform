// Meta Conversions API (CAPI) integration.
// Sends Lead/Contact/Subscribe/etc. events to graph.facebook.com/{pixel_id}/events
// for ad attribution. PII (email, phone) is SHA-256 hashed before sending.
//
// Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// Payload format the user wants to send (example for a Lead event):
// {
//   "data": [{
//     "event_name": "Lead",
//     "event_time": 1673035686,
//     "action_source": "system_generated",
//     "user_data": {
//       "em": [<sha256(email)>],
//       "ph": [<sha256(phone)>],
//       "lead_id": <number>
//     },
//     "custom_data": {
//       "event_source": "crm",
//       "lead_event_source": "Your CRM"
//     }
//   }]
// }

import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { parseJSON } from '@/lib/http'

export interface MetaCAPIConfig {
  accessToken: string
  pixelId: string
  apiVersion?: string // e.g. "v21.0"
  testEventCode?: string // optional META TEST_EVENT_CODE for sandbox validation
}

export async function getMetaCAPIConfig(): Promise<MetaCAPIConfig | null> {
  // Env override first
  const envToken = process.env.META_CAPI_ACCESS_TOKEN
  const envPixel = process.env.META_CAPI_PIXEL_ID
  if (envToken && envPixel) {
    return {
      accessToken: envToken,
      pixelId: envPixel,
      apiVersion: process.env.META_CAPI_API_VERSION || 'v21.0',
      testEventCode: process.env.META_CAPI_TEST_EVENT_CODE,
    }
  }
  const integration = await db.integration.findUnique({ where: { provider: 'META_CAPI' } })
  if (!integration) return null
  const config = parseJSON<MetaCAPIConfig>(integration.config, {} as MetaCAPIConfig)
  if (!config.accessToken || !config.pixelId) return null
  return {
    accessToken: config.accessToken,
    pixelId: config.pixelId,
    apiVersion: config.apiVersion || 'v21.0',
    testEventCode: config.testEventCode,
  }
}

export async function getMetaCAPIStatus(): Promise<'CONNECTED' | 'DISCONNECTED'> {
  return (await getMetaCAPIConfig()) ? 'CONNECTED' : 'DISCONNECTED'
}

/** SHA-256 hash a string and return hex. Meta requires lowercase, trimmed input before hashing. */
export function sha256Hex(input: string): string {
  const normalized = input.trim().toLowerCase()
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

export interface CAPIEventInput {
  eventName: string // Lead | Contact | Subscribe | Purchase | etc.
  eventTime?: number // unix seconds; defaults to now
  actionSource?: string // "system_generated" | "website" | "app" | "physical_store" | "phone_call"
  leadId?: string | number
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  country?: string
  zip?: string
  customData?: Record<string, any>
}

export interface CAPIEventResult {
  ok: boolean
  providerId?: string
  error?: string
  payload: any
}

/** Build a Meta CAPI event payload from the input. PII is hashed. */
export function buildCAPIEvent(input: CAPIEventInput): any {
  const userData: any = {}
  if (input.email) userData.em = [sha256Hex(input.email)]
  if (input.phone) {
    // Meta wants phone digits only, with country code, no leading +
    const digits = input.phone.replace(/[^\d]/g, '')
    userData.ph = [sha256Hex(digits)]
  }
  if (input.firstName) userData.fn = [sha256Hex(input.firstName)]
  if (input.lastName) userData.ln = [sha256Hex(input.lastName)]
  if (input.city) userData.ct = [sha256Hex(input.city)]
  if (input.state) userData.st = [sha256Hex(input.state)]
  if (input.country) userData.country = [sha256Hex(input.country)]
  if (input.zip) userData.zp = [sha256Hex(input.zip)]
  if (input.leadId !== undefined) {
    // lead_id must be a numeric string
    const numeric = String(input.leadId).replace(/[^\d]/g, '')
    if (numeric) userData.lead_id = numeric
  }

  const event: any = {
    event_name: input.eventName,
    event_time: input.eventTime || Math.floor(Date.now() / 1000),
    action_source: input.actionSource || 'system_generated',
    user_data: userData,
  }

  if (input.customData || true) {
    event.custom_data = {
      event_source: 'crm',
      lead_event_source: 'LeadPulse',
      ...(input.customData || {}),
    }
  }

  return event
}

/** Send a CAPI event to Meta. Throws if not configured. */
export async function sendMetaConversionEvent(input: CAPIEventInput): Promise<CAPIEventResult> {
  const config = await getMetaCAPIConfig()
  if (!config) {
    throw new Error('Meta CAPI NOT CONNECTED. Configure Access Token and Pixel ID in Integrations or META_CAPI_ACCESS_TOKEN / META_CAPI_PIXEL_ID env vars.')
  }

  const event = buildCAPIEvent(input)
  const payload: any = {
    data: [event],
  }
  if (config.testEventCode) {
    payload.test_event_code = config.testEventCode
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.pixelId}/events?access_token=${encodeURIComponent(config.accessToken)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errMsg = json?.error?.message || JSON.stringify(json) || `HTTP ${res.status}`
    return { ok: false, error: errMsg, payload }
  }

  return {
    ok: true,
    providerId: json?.events_received || json?.fb_trace_id || 'sent',
    payload,
  }
}

/** Convenience: fire a Lead event for a LeadPulse lead record. */
export async function fireLeadEventForLead(lead: any, eventName = 'Lead'): Promise<CAPIEventResult> {
  return sendMetaConversionEvent({
    eventName,
    actionSource: 'system_generated',
    leadId: lead.id,
    email: lead.email || undefined,
    phone: lead.whatsapp || undefined,
    firstName: lead.contactPerson?.split(' ')[0] || undefined,
    lastName: lead.contactPerson?.split(' ').slice(1).join(' ') || undefined,
    city: lead.city || undefined,
    state: lead.state || undefined,
    country: lead.country || undefined,
    customData: {
      lead_status: lead.status,
      lead_score: String(lead.score || 0),
      business_name: lead.businessName,
      category: lead.category || '',
    },
  })
}
