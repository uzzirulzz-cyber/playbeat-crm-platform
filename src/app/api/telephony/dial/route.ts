// Telephony dial: alias for POST /api/calls (kept separate for semantic clarity)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'
import { initiateCall, getTelephonyStatus } from '@/lib/telephony'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const to = String(body.to || '').trim()
    if (!to) return badRequest('to (phone number) required')

    const status = await getTelephonyStatus()
    if (!status.connected) {
      return badRequest('Telephony provider not configured. Configure Twilio or Vonage in Integrations, or set TELEPHONY_PROVIDER=mock for local development.')
    }

    const result = await initiateCall({
      to,
      from: body.from,
      leadId: body.leadId || undefined,
      leadName: body.leadName || undefined,
      leadPhone: body.leadPhone || undefined,
      employeeId: user.id,
      employeeName: user.name,
      conversationId: body.conversationId || undefined,
    })

    if (!result.ok) return badRequest(result.error || 'Failed to initiate call')

    await writeAuditLog({
      user,
      action: 'CALL_INITIATED',
      entity: 'Call',
      entityId: result.callId,
      details: `Dial ${to} via ${status.provider}`,
      req,
    })

    return ok({
      callId: result.callId,
      providerCallId: result.providerCallId,
      provider: status.provider,
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
