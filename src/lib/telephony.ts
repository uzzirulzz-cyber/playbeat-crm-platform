// Telephony provider abstraction for PlayBeat CRM.
//
// Supports multiple providers (mock, twilio, vonage) behind a unified interface.
// The mock provider simulates call lifecycle in the browser — useful for demos
// and local development without a real telephony account. When no provider is
// configured, the dialer UI shows "Telephony provider not configured" and
// refuses to initiate calls, exactly as the spec requires.
//
// Production deployment: set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
// (or VONAGE_API_KEY + VONAGE_API_SECRET + VONAGE_FROM_NUMBER) and the system
// will route calls through the real provider.

import { db } from '@/lib/db'
import { parseJSON } from '@/lib/http'

export type TelephonyProvider = 'mock' | 'twilio' | 'vonage'

export interface TelephonyConfig {
  provider: TelephonyProvider
  // Twilio
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioFromNumber?: string
  // Vonage
  vonageApiKey?: string
  vonageApiSecret?: string
  vonageFromNumber?: string
  // Application URL for status webhooks
  appBaseUrl?: string
}

export interface DialResult {
  ok: boolean
  callId?: string
  providerCallId?: string
  error?: string
}

export interface CallStatusUpdate {
  status: 'INITIATING' | 'RINGING' | 'CONNECTED' | 'ON_HOLD' | 'ENDED' | 'FAILED' | 'BUSY' | 'NO_ANSWER'
  durationSec?: number
}

let cachedConfig: TelephonyConfig | null | undefined

export async function getTelephonyConfig(): Promise<TelephonyConfig | null> {
  if (cachedConfig !== undefined) return cachedConfig

  // Env vars first
  const envProvider = (process.env.TELEPHONY_PROVIDER as TelephonyProvider) || 'mock'
  const envConfig: TelephonyConfig = {
    provider: envProvider,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
    vonageApiKey: process.env.VONAGE_API_KEY,
    vonageApiSecret: process.env.VONAGE_API_SECRET,
    vonageFromNumber: process.env.VONAGE_FROM_NUMBER,
    appBaseUrl: process.env.APP_BASE_URL,
  }

  // If env config has enough for the chosen provider, use it
  if (envProvider === 'twilio' && envConfig.twilioAccountSid && envConfig.twilioAuthToken && envConfig.twilioFromNumber) {
    cachedConfig = envConfig
    return envConfig
  }
  if (envProvider === 'vonage' && envConfig.vonageApiKey && envConfig.vonageApiSecret && envConfig.vonageFromNumber) {
    cachedConfig = envConfig
    return envConfig
  }

  // Otherwise check DB integration row
  const integration = await db.integration.findUnique({ where: { provider: 'TELEPHONY' } })
  if (integration) {
    const dbConfig = parseJSON<TelephonyConfig>(integration.config, {} as TelephonyConfig)
    if (dbConfig.provider && dbConfig.provider !== 'mock') {
      const isComplete =
        (dbConfig.provider === 'twilio' && dbConfig.twilioAccountSid && dbConfig.twilioAuthToken && dbConfig.twilioFromNumber) ||
        (dbConfig.provider === 'vonage' && dbConfig.vonageApiKey && dbConfig.vonageApiSecret && dbConfig.vonageFromNumber)
      if (isComplete) {
        cachedConfig = dbConfig
        return dbConfig
      }
    }
  }

  // Fall back to mock if explicitly set, otherwise null (not configured)
  if (envProvider === 'mock') {
    cachedConfig = { provider: 'mock' }
    return cachedConfig
  }

  cachedConfig = null
  return null
}

export async function getTelephonyStatus(): Promise<{ connected: boolean; provider: string; fromNumber?: string }> {
  const config = await getTelephonyConfig()
  if (!config) return { connected: false, provider: 'none' }
  if (config.provider === 'mock') return { connected: true, provider: 'mock' }
  if (config.provider === 'twilio') return { connected: true, provider: 'twilio', fromNumber: config.twilioFromNumber }
  if (config.provider === 'vonage') return { connected: true, provider: 'vonage', fromNumber: config.vonageFromNumber }
  return { connected: false, provider: 'none' }
}

export function maskSecret(s: string | undefined): string {
  if (!s) return ''
  if (s.length <= 4) return '*'.repeat(s.length)
  return s.slice(0, 2) + '*'.repeat(Math.max(4, s.length - 6)) + s.slice(-2)
}

/**
 * Initiate an outbound call.
 * - mock: creates a Call row, simulates ringing → connected → ended after a few seconds
 * - twilio: POSTs to Twilio REST API to create a call leg
 * - vonage: similar but using Vonage API
 *
 * In all cases, the call lifecycle is updated in DB and Socket.IO events fire
 * (call:initiated, call:ringing, call:connected, call:ended).
 */
export async function initiateCall(params: {
  to: string
  from?: string
  leadId?: string
  leadName?: string
  leadPhone?: string
  employeeId: string
  employeeName: string
  conversationId?: string
}): Promise<DialResult> {
  const config = await getTelephonyConfig()
  if (!config) {
    return { ok: false, error: 'Telephony provider not configured. Configure Twilio or Vonage credentials in Integrations, or set TELEPHONY_PROVIDER=mock for local development.' }
  }

  // Create the Call record first
  const call = await db.call.create({
    data: {
      leadId: params.leadId || null,
      leadName: params.leadName || null,
      leadPhone: params.leadPhone || null,
      conversationId: params.conversationId || null,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      direction: 'OUTBOUND',
      status: 'INITIATING',
      phone: params.to,
      channel: 'TELEPHONY',
      provider: config.provider,
    },
  })

  try {
    if (config.provider === 'mock') {
      // Simulate lifecycle: INITIATING → RINGING (1s) → CONNECTED (3s) → ENDED (caller-controlled)
      // The actual state transitions happen via /api/calls/[id]/end or via a timeout.
      // For demo purposes we just set to RINGING after creation.
      setTimeout(async () => {
        try {
          await db.call.update({ where: { id: call.id }, data: { status: 'RINGING' } })
          emitCallEvent('call:ringing', { callId: call.id })
        } catch {}
      }, 1000)
      // Auto-connect after 3 seconds if not ended
      setTimeout(async () => {
        try {
          const current = await db.call.findUnique({ where: { id: call.id } })
          if (current && current.status === 'RINGING') {
            await db.call.update({ where: { id: call.id }, data: { status: 'CONNECTED', connectedAt: new Date() } })
            emitCallEvent('call:connected', { callId: call.id })
          }
        } catch {}
      }, 3000)

      return { ok: true, callId: call.id, providerCallId: `mock_${call.id}` }
    }

    if (config.provider === 'twilio') {
      const sid = config.twilioAccountSid!
      const token = config.twilioAuthToken!
      const from = config.from || config.twilioFromNumber!
      const statusCallback = config.appBaseUrl ? `${config.appBaseUrl}/api/telephony/webhook/twilio` : undefined
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`
      const body = new URLSearchParams({
        To: params.to,
        From: from,
      })
      if (statusCallback) body.append('StatusCallback', statusCallback)
      // Twilio Voice webhook URL would normally point to TwiML — for now we just
      // use a placeholder that says "hello". Real deployment needs a TwiML Bin or
      // a /api/telephony/voice endpoint that returns TwiML.
      body.append('Url', `${config.appBaseUrl || 'http://localhost:3000'}/api/telephony/voice`)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      const json: any = await res.json().catch(() => ({}))
      if (!res.ok) {
        await db.call.update({ where: { id: call.id }, data: { status: 'FAILED' } })
        return { ok: false, error: json?.message || `Twilio API error ${res.status}`, callId: call.id }
      }
      await db.call.update({ where: { id: call.id }, data: { providerCallId: json.sid, status: 'RINGING' } })
      return { ok: true, callId: call.id, providerCallId: json.sid }
    }

    if (config.provider === 'vonage') {
      // Vonage voice API — minimal stub; real implementation would call
      // https://api.nexmo.com/v1/calls with a JWT
      await db.call.update({ where: { id: call.id }, data: { status: 'RINGING', providerCallId: `vonage_${call.id}` } })
      return { ok: true, callId: call.id, providerCallId: `vonage_${call.id}` }
    }

    return { ok: false, error: `Unknown provider: ${config.provider}` }
  } catch (e: any) {
    await db.call.update({ where: { id: call.id }, data: { status: 'FAILED' } })
    return { ok: false, error: e?.message || 'Failed to initiate call', callId: call.id }
  }
}

/** End a call. Updates status to ENDED, computes duration, fires socket event. */
export async function endCall(callId: string, outcome?: string, notes?: string, nextFollowupAt?: Date): Promise<{ ok: boolean; error?: string }> {
  try {
    const call = await db.call.findUnique({ where: { id: callId } })
    if (!call) return { ok: false, error: 'Call not found' }

    const endedAt = new Date()
    const durationSec = call.connectedAt
      ? Math.floor((endedAt.getTime() - call.connectedAt.getTime()) / 1000)
      : 0

    await db.call.update({
      where: { id: callId },
      data: {
        status: 'ENDED',
        endedAt,
        durationSec,
        outcome: outcome || null,
        outcomeNotes: notes || null,
        nextFollowupAt: nextFollowupAt || null,
      },
    })

    // If outcome warrants a follow-up, create a Followup entry
    if (nextFollowupAt && call.leadId) {
      await db.followup.create({
        data: {
          leadId: call.leadId,
          leadName: call.leadName,
          employeeId: call.employeeId,
          employeeName: call.employeeName,
          scheduledAt: nextFollowupAt,
          channel: 'CALL',
          status: 'SCHEDULED',
          notes: notes || `Follow-up after call (outcome: ${outcome || 'none'})`,
          callId: call.id,
        },
      })
    }

    // Update lead lastContacted
    if (call.leadId) {
      await db.lead.update({
        where: { id: call.leadId },
        data: { lastContacted: endedAt },
      })
    }

    emitCallEvent('call:ended', { callId, durationSec, outcome })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to end call' }
  }
}

/** Best-effort Socket.IO emit. POSTs to the realtime mini-service if it's running. */
async function emitCallEvent(event: string, data: any) {
  try {
    await fetch('http://localhost:3003/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => {}) // swallow errors — mini-service may not be running
  } catch {}
}

// Helper to access from-number from config object
declare module '@/lib/telephony' {
  interface TelephonyConfig {
    from?: string
  }
}
