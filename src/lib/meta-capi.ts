// Meta Conversions API (CAPI) integration — extended with all 17 Meta Pixel
// standard events per https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking#standard-events
//
// Each standard event has:
//   - description (per Meta docs)
//   - objectProperties (which custom_data fields are Optional / Required)
//   - promotedObjectCustomEventType (for promoted_object.custom_event_type)
//
// PII (email, phone, name, city, state, country, zip, etc.) is SHA-256 hashed
// before sending per Meta's Advanced Measurement spec.

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

// ─────────────────────────────────────────────────────────────────────────────
// Standard events catalog
// ─────────────────────────────────────────────────────────────────────────────

export type StandardEventName =
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent'

export interface ObjectPropertySpec {
  key: string
  type: 'string' | 'integer' | 'float' | 'boolean' | 'array_of_integers_or_strings' | 'array_of_objects' | 'string_currency'
  required: 'required' | 'optional'
  requiredForAdvantagePlusCatalog?: boolean
  description: string
}

export interface StandardEventSpec {
  name: StandardEventName
  description: string
  example: string
  promotedObjectCustomEventType: string
  objectProperties: ObjectPropertySpec[]
}

export const STANDARD_EVENTS: StandardEventSpec[] = [
  {
    name: 'AddPaymentInfo',
    description: 'When payment information is added in the checkout flow. A person clicks on a save billing information button.',
    example: 'A person clicks on a save billing information button.',
    promotedObjectCustomEventType: 'ADD_PAYMENT_INFO',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event, such as SKUs.' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', description: 'Array of objects with id and quantity.' },
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code (e.g. USD, PKR).' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event to the business.' },
    ],
  },
  {
    name: 'AddToCart',
    description: 'When a product is added to the shopping cart. A person clicks on an add to cart button.',
    example: 'A person clicks on an add to cart button.',
    promotedObjectCustomEventType: 'ADD_TO_CART',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event.' },
      { key: 'content_type', type: 'string', required: 'optional', description: 'Either "product" or "product_group".' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', requiredForAdvantagePlusCatalog: true, description: 'Required for Advantage+ catalog ads. Array of objects with id and quantity.' },
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'AddToWishlist',
    description: 'When a product is added to a wishlist. A person clicks on an add to wishlist button.',
    example: 'A person clicks on an add to wishlist button.',
    promotedObjectCustomEventType: 'ADD_TO_WISHLIST',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event.' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', description: 'Array of objects with id and quantity.' },
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'CompleteRegistration',
    description: 'When a registration form is completed. A person submits a completed subscription or signup form.',
    example: 'A person submits a completed subscription or signup form.',
    promotedObjectCustomEventType: 'COMPLETE_REGISTRATION',
    objectProperties: [
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
      { key: 'status', type: 'boolean', required: 'optional', description: 'Show the status of the registration.' },
    ],
  },
  {
    name: 'Contact',
    description: 'When a person initiates contact with your business via telephone, SMS, email, chat, etc.',
    example: 'A person submits a question about a product.',
    promotedObjectCustomEventType: 'CONTACT',
    objectProperties: [],
  },
  {
    name: 'CustomizeProduct',
    description: 'When a person customizes a product. A person selects the color of a t-shirt.',
    example: 'A person selects the color of a t-shirt.',
    promotedObjectCustomEventType: 'CUSTOMIZE_PRODUCT',
    objectProperties: [],
  },
  {
    name: 'Donate',
    description: 'When a person donates funds to your organization or cause.',
    example: 'A person adds a donation to the Humane Society to their cart.',
    promotedObjectCustomEventType: '',
    objectProperties: [],
  },
  {
    name: 'FindLocation',
    description: 'When a person searches for a location of your store via a website or app, with an intention to visit the physical location.',
    example: 'A person wants to find a specific product in a local store.',
    promotedObjectCustomEventType: 'FIND_LOCATION',
    objectProperties: [],
  },
  {
    name: 'InitiateCheckout',
    description: 'When a person enters the checkout flow prior to completing the checkout flow.',
    example: 'A person clicks on a checkout button.',
    promotedObjectCustomEventType: 'INITIATE_CHECKOUT',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event.' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', description: 'Array of objects with id and quantity.' },
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'num_items', type: 'integer', required: 'optional', description: 'Number of items when checkout was initiated.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'Lead',
    description: 'When a sign up is completed. A person clicks on pricing.',
    example: 'A person clicks on pricing.',
    promotedObjectCustomEventType: 'LEAD',
    objectProperties: [
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'Purchase',
    description: 'When a purchase is made or checkout flow is completed.',
    example: 'A person has finished the purchase or checkout flow and lands on thank you or confirmation page.',
    promotedObjectCustomEventType: 'PURCHASE',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event.' },
      { key: 'content_type', type: 'string', required: 'optional', description: 'Either "product" or "product_group".' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', requiredForAdvantagePlusCatalog: true, description: 'Required for Advantage+ catalog ads.' },
      { key: 'currency', type: 'string_currency', required: 'required', description: 'REQUIRED. ISO 4217 currency code.' },
      { key: 'num_items', type: 'integer', required: 'optional', description: 'Number of items purchased.' },
      { key: 'value', type: 'float', required: 'required', description: 'REQUIRED. Value of the purchase.' },
    ],
  },
  {
    name: 'Schedule',
    description: 'When a person books an appointment to visit one of your locations.',
    example: 'A person selects a date and time for a tennis lesson.',
    promotedObjectCustomEventType: 'SCHEDULE',
    objectProperties: [],
  },
  {
    name: 'Search',
    description: 'When a search is made. A person searches for a product on your website.',
    example: 'A person searches for a product on your website.',
    promotedObjectCustomEventType: 'SEARCH',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event.' },
      { key: 'content_type', type: 'string', required: 'optional', description: 'Either "product" or "product_group".' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', requiredForAdvantagePlusCatalog: true, description: 'Required for Advantage+ catalog ads.' },
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'search_string', type: 'string', required: 'optional', description: 'The string entered by the user for the search.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'StartTrial',
    description: 'When a person starts a free trial of a product or service you offer.',
    example: 'A person selects a free week of your game.',
    promotedObjectCustomEventType: 'START_TRIAL',
    objectProperties: [
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'predicted_ltv', type: 'float', required: 'optional', description: 'Predicted lifetime value of a subscriber.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'SubmitApplication',
    description: 'When a person applies for a product, service, or program you offer.',
    example: 'A person applies for a credit card, educational program, or job.',
    promotedObjectCustomEventType: 'SUBMIT_APPLICATION',
    objectProperties: [],
  },
  {
    name: 'Subscribe',
    description: 'When a person applies to start a paid subscription for a product or service you offer.',
    example: 'A person subscribes to your streaming service.',
    promotedObjectCustomEventType: 'SUBSCRIBE',
    objectProperties: [
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'predicted_ltv', type: 'float', required: 'optional', description: 'Predicted lifetime value of a subscriber.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
  {
    name: 'ViewContent',
    description: 'A visit to a web page you care about (e.g. product page or landing page).',
    example: 'A person lands on a product details page.',
    promotedObjectCustomEventType: 'VIEW_CONTENT',
    objectProperties: [
      { key: 'content_ids', type: 'array_of_integers_or_strings', required: 'optional', description: 'Product IDs associated with the event.' },
      { key: 'content_type', type: 'string', required: 'optional', description: 'Either "product" or "product_group".' },
      { key: 'contents', type: 'array_of_objects', required: 'optional', requiredForAdvantagePlusCatalog: true, description: 'Required for Advantage+ catalog ads.' },
      { key: 'currency', type: 'string_currency', required: 'optional', description: 'ISO 4217 currency code.' },
      { key: 'value', type: 'float', required: 'optional', description: 'Value of the user performing this event.' },
    ],
  },
]

export function getStandardEventSpec(name: string): StandardEventSpec | undefined {
  return STANDARD_EVENTS.find((e) => e.name === name)
}

export function isStandardEvent(name: string): name is StandardEventName {
  return STANDARD_EVENTS.some((e) => e.name === name)
}

// ─────────────────────────────────────────────────────────────────────────────
// Object properties (custom_data keys) — full catalog per Meta docs
// ─────────────────────────────────────────────────────────────────────────────

export const OBJECT_PROPERTIES: { key: string; type: string; description: string }[] = [
  { key: 'content_category', type: 'string', description: 'Category of the page/product.' },
  { key: 'content_ids', type: 'array_of_integers_or_strings', description: "Product IDs associated with the event, such as SKUs (e.g. ['ABC123', 'XYZ789'])." },
  { key: 'content_name', type: 'string', description: 'Name of the page/product.' },
  { key: 'content_type', type: 'string', description: 'Either "product" or "product_group" based on the content_ids or contents being passed.' },
  { key: 'contents', type: 'array_of_objects', description: "Array of JSON objects with id and quantity. e.g. [{'id': 'ABC123', 'quantity': 2}]." },
  { key: 'currency', type: 'string_currency', description: 'ISO 4217 currency code for the value specified (e.g. USD, PKR, EUR).' },
  { key: 'num_items', type: 'integer', description: 'Used with InitiateCheckout. The number of items when checkout was initiated.' },
  { key: 'predicted_ltv', type: 'float', description: 'Predicted lifetime value of a subscriber as defined by the advertiser.' },
  { key: 'search_string', type: 'string', description: 'Used with Search. The string entered by the user for the search.' },
  { key: 'status', type: 'boolean', description: 'Used with CompleteRegistration, to show the status of the registration.' },
  { key: 'value', type: 'float', description: 'Value of a user performing this event to the business.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Event payload builder + sender
// ─────────────────────────────────────────────────────────────────────────────

export interface CAPIEventInput {
  eventName: string
  eventTime?: number // unix seconds; defaults to now
  actionSource?: string // "system_generated" | "website" | "app" | "physical_store" | "phone_call"
  eventId?: string // for deduplication with Pixel fbq('track', ..., eventID)
  eventSourceUrl?: string // URL where the event occurred (for website action_source)
  leadId?: string | number
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  country?: string
  zip?: string
  /** Object properties from the Meta spec — content_ids, contents, currency, value, etc. */
  objectProperties?: Record<string, any>
  /** Additional custom_data fields beyond the standard object properties */
  customData?: Record<string, any>
}

export interface CAPIEventResult {
  ok: boolean
  providerId?: string
  error?: string
  payload: any
  metaResponse?: any
}

/** Validate object properties against the standard event spec. Returns array of error messages. */
export function validateObjectProperties(eventName: string, props: Record<string, any>): string[] {
  const errors: string[] = []
  const spec = getStandardEventSpec(eventName)

  // Normalize props: parse JSON strings for array-type fields (form inputs send strings)
  const normalized: Record<string, any> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === '') continue
    const propSpec = OBJECT_PROPERTIES.find((p) => p.key === k)
    if (propSpec && typeof v === 'string' && (propSpec.type === 'array_of_integers_or_strings' || propSpec.type === 'array_of_objects')) {
      try {
        normalized[k] = JSON.parse(v)
      } catch {
        normalized[k] = v // let validation catch it
      }
    } else if (propSpec && propSpec.type === 'integer' && typeof v === 'string') {
      normalized[k] = parseInt(v, 10)
    } else if (propSpec && (propSpec.type === 'float' || propSpec.type === 'integer') && typeof v === 'string' && v !== '') {
      normalized[k] = Number(v)
    } else if (propSpec && propSpec.type === 'boolean' && typeof v === 'string') {
      normalized[k] = v === 'true' || v === '1'
    } else {
      normalized[k] = v
    }
  }

  // If it's a standard event, check required fields
  if (spec) {
    for (const propSpec of spec.objectProperties) {
      if (propSpec.required === 'required' && (normalized[propSpec.key] === undefined || normalized[propSpec.key] === null || normalized[propSpec.key] === '')) {
        errors.push(`Missing required property: ${propSpec.key}`)
      }
    }
  }

  // Validate types for provided properties
  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined || value === null || value === '') continue
    const propSpec = OBJECT_PROPERTIES.find((p) => p.key === key)
    if (!propSpec) continue // allow unknown keys for custom events

    switch (propSpec.type) {
      case 'string':
        if (typeof value !== 'string') errors.push(`${key} must be a string`)
        break
      case 'integer':
        if (!Number.isInteger(Number(value)) || isNaN(Number(value))) errors.push(`${key} must be an integer`)
        break
      case 'float':
        if (typeof value !== 'number' && isNaN(Number(value))) errors.push(`${key} must be a number`)
        break
      case 'boolean':
        if (typeof value !== 'boolean') errors.push(`${key} must be a boolean`)
        break
      case 'string_currency':
        if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
          errors.push(`${key} must be a 3-letter ISO 4217 currency code (e.g. USD, PKR)`)
        }
        break
      case 'array_of_integers_or_strings':
        if (!Array.isArray(value)) errors.push(`${key} must be an array (e.g. ["ABC123","XYZ789"])`)
        break
      case 'array_of_objects':
        if (!Array.isArray(value)) {
          errors.push(`${key} must be an array of objects (e.g. [{"id":"ABC123","quantity":2}])`)
        } else {
          for (const item of value) {
            if (typeof item !== 'object' || item === null) {
              errors.push(`${key} array items must be objects with at least {id, quantity}`)
              break
            }
          }
        }
        break
    }
  }

  return errors
}

/** Build a Meta CAPI event payload from the input. PII is hashed. Object properties go in custom_data. */
export function buildCAPIEvent(input: CAPIEventInput): any {
  const userData: any = {}
  if (input.email) userData.em = [sha256Hex(input.email)]
  if (input.phone) {
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
    const numeric = String(input.leadId).replace(/[^\d]/g, '')
    if (numeric) userData.lead_id = numeric
  }

  const event: any = {
    event_name: input.eventName,
    event_time: input.eventTime || Math.floor(Date.now() / 1000),
    action_source: input.actionSource || 'system_generated',
    user_data: userData,
  }

  // event_id for deduplication (CAPI + Pixel can share event_id)
  if (input.eventId) {
    event.event_id = input.eventId
  }

  // event_source_url (only meaningful for website action_source)
  if (input.eventSourceUrl) {
    event.event_source_url = input.eventSourceUrl
  }

  // custom_data: standard object properties + extra custom fields
  const customData: any = {
    event_source: 'crm',
    lead_event_source: 'LeadPulse',
    ...(input.customData || {}),
  }

  if (input.objectProperties) {
    for (const [k, v] of Object.entries(input.objectProperties)) {
      if (v !== undefined && v !== null && v !== '') {
        // Parse JSON-encoded array properties (sent from form input as strings)
        if (typeof v === 'string' && (k === 'content_ids' || k === 'contents')) {
          try {
            customData[k] = JSON.parse(v)
          } catch {
            customData[k] = v
          }
        } else if ((k === 'value' || k === 'predicted_ltv') && typeof v === 'string') {
          customData[k] = Number(v)
        } else if (k === 'num_items' && typeof v === 'string') {
          customData[k] = parseInt(v, 10)
        } else if (k === 'status' && typeof v === 'string') {
          customData[k] = v === 'true' || v === '1'
        } else {
          customData[k] = v
        }
      }
    }
  }

  event.custom_data = customData

  return event
}

/** Send a CAPI event to Meta. Throws if not configured. Validates standard events first. */
export async function sendMetaConversionEvent(input: CAPIEventInput): Promise<CAPIEventResult> {
  const config = await getMetaCAPIConfig()
  if (!config) {
    throw new Error('Meta CAPI NOT CONNECTED. Configure Access Token and Pixel ID in Integrations or META_CAPI_ACCESS_TOKEN / META_CAPI_PIXEL_ID env vars.')
  }

  // Validate required object properties for standard events
  if (isStandardEvent(input.eventName) && input.objectProperties) {
    const errors = validateObjectProperties(input.eventName, input.objectProperties)
    if (errors.length > 0) {
      return {
        ok: false,
        error: `Validation failed: ${errors.join('; ')}`,
        payload: null,
      }
    }
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
    return { ok: false, error: errMsg, payload, metaResponse: json }
  }

  return {
    ok: true,
    providerId: String(json?.events_received || json?.fb_trace_id || 'sent'),
    payload,
    metaResponse: json,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: fire an event for a LeadPulse lead record
// ─────────────────────────────────────────────────────────────────────────────

export async function fireLeadEventForLead(
  lead: any,
  eventName: string = 'Lead',
  objectProperties?: Record<string, any>,
  eventId?: string,
): Promise<CAPIEventResult> {
  return sendMetaConversionEvent({
    eventName,
    actionSource: 'system_generated',
    eventId,
    leadId: lead.id,
    email: lead.email || undefined,
    phone: lead.whatsapp || undefined,
    firstName: lead.contactPerson?.split(' ')[0] || undefined,
    lastName: lead.contactPerson?.split(' ').slice(1).join(' ') || undefined,
    city: lead.city || undefined,
    state: lead.state || undefined,
    country: lead.country || undefined,
    objectProperties,
    customData: {
      lead_status: lead.status,
      lead_score: String(lead.score || 0),
      business_name: lead.businessName,
      category: lead.category || '',
    },
  })
}
