// Calls API: GET list + POST initiate
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'
import { initiateCall, getTelephonyStatus } from '@/lib/telephony'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const direction = url.searchParams.get('direction')
    const status = url.searchParams.get('status')
    const employeeId = url.searchParams.get('employeeId')
    const leadId = url.searchParams.get('leadId')
    const outcome = url.searchParams.get('outcome')

    const where: any = {}
    if (direction) where.direction = direction
    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId
    if (leadId) where.leadId = leadId
    if (outcome) where.outcome = outcome

    const calls = await db.call.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 200,
    })
    return ok({ calls })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

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

    if (!result.ok) {
      return badRequest(result.error || 'Failed to initiate call')
    }

    await writeAuditLog({
      user,
      action: 'CALL_INITIATED',
      entity: 'Call',
      entityId: result.callId,
      details: `Outbound call to ${to} via ${status.provider} (providerCallId: ${result.providerCallId || '—'})`,
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
