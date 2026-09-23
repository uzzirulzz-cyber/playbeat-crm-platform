// Send a message into a conversation (manual reply)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError } from '@/lib/http'
import { sendWhatsAppMessage, sendEmailMessage } from '@/lib/providers'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params; const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) return notFound('Conversation not found')

    const text = String(body.body || '').trim()
    if (!text) return Response.json({ error: 'body required' }, { status: 400 })

    let providerId: string | undefined
    if (conversation.channel === 'WHATSAPP' && conversation.leadPhone) {
      try {
        const r = await sendWhatsAppMessage({ to: conversation.leadPhone, body: text })
        providerId = r.providerId
      } catch (e: any) {
        return serverError(e?.message || 'WhatsApp send failed')
      }
    } else if (conversation.channel === 'EMAIL' && conversation.leadEmail) {
      try {
        const r = await sendEmailMessage({ to: conversation.leadEmail, subject: body.subject || `Re: ${conversation.leadName}`, text })
        providerId = r.providerId
      } catch (e: any) {
        return serverError(e?.message || 'Email send failed')
      }
    }

    const msg = await db.message.create({
      data: {
        conversationId: id,
        leadId: conversation.leadId,
        channel: conversation.channel,
        direction: 'OUTBOUND',
        body: text,
        subject: body.subject || null,
        providerId,
        status: providerId ? 'SENT' : 'FAILED',
      },
    })
    await db.conversation.update({
      where: { id },
      data: { lastMessage: text, lastMessageAt: new Date() },
    })
    await writeAuditLog({ user, action: 'MESSAGE_SEND', entity: 'Conversation', entityId: id, req })
    return ok({ message: msg })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
