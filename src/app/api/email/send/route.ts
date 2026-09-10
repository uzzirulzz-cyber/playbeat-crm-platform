// Send email directly. Body: { to, subject, text, html }
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'
import { sendEmailMessage } from '@/lib/providers'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    if (!body.to || !body.subject || !body.text) return badRequest('to, subject, text required')
    const r = await sendEmailMessage({ to: body.to, subject: body.subject, text: body.text, html: body.html })
    const msg = await db.message.create({
      data: {
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        subject: body.subject,
        body: body.text,
        providerId: r.providerId,
        status: 'SENT',
        leadId: body.leadId || null,
      },
    })
    await writeAuditLog({ user, action: 'EMAIL_SEND', entity: 'Message', entityId: msg.id, details: body.to, req })
    return ok({ message: msg })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
