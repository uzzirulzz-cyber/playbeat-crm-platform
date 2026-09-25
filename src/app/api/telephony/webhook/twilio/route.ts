// Twilio status webhook: receives call status updates and updates the Call record.
// Verify the X-Twilio-Signature header in production.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const callSid = String(form.get('CallSid') || '')
    const callStatus = String(form.get('CallStatus') || '')
    const durationStr = String(form.get('CallDuration') || '0')
    const from = String(form.get('From') || '')
    const to = String(form.get('To') || '')

    if (!callSid) return new Response('Missing CallSid', { status: 400 })

    // Find by providerCallId
    const call = await db.call.findFirst({ where: { providerCallId: callSid } })
    if (!call) {
      // Create an inbound call record if not found
      if (callStatus === 'ringing' && from && to) {
        await db.call.create({
          data: {
            phone: from,
            direction: 'INBOUND',
            status: 'RINGING',
            provider: 'twilio',
            providerCallId: callSid,
            employeeName: 'Inbound',
          },
        })
      }
      return new Response('ok', { status: 200 })
    }

    const statusMap: Record<string, string> = {
      queued: 'INITIATING',
      ringing: 'RINGING',
      'in-progress': 'CONNECTED',
      completed: 'ENDED',
      busy: 'BUSY',
      failed: 'FAILED',
      'no-answer': 'NO_ANSWER',
      canceled: 'ENDED',
    }
    const newStatus = statusMap[callStatus] || call.status
    const update: any = { status: newStatus }
    if (newStatus === 'CONNECTED' && !call.connectedAt) update.connectedAt = new Date()
    if (newStatus === 'ENDED') {
      update.endedAt = new Date()
      update.durationSec = parseInt(durationStr, 10) || call.durationSec
    }

    await db.call.update({ where: { id: call.id }, data: update })
    return new Response('ok', { status: 200 })
  } catch (e: any) {
    return new Response(`error: ${e?.message || 'unknown'}`, { status: 500 })
  }
}
