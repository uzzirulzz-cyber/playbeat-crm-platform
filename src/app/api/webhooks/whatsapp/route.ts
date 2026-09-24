// WhatsApp Cloud API webhook endpoint.
// GET  → verify webhook with hub.verify_token / hub.challenge.
// POST → receive status updates and inbound messages; idempotent via WebhookEvent log.
//        Verifies X-Hub-Signature-256 header using App Secret when configured.
import { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { verifyWhatsAppWebhookToken } from '@/lib/providers'
import { parseJSON } from '@/lib/http'

/** Get the WhatsApp App Secret from env or DB integration. */
async function getWhatsAppAppSecret(): Promise<string | null> {
  // Env var first
  if (process.env.WHATSAPP_APP_SECRET) return process.env.WHATSAPP_APP_SECRET
  // DB integration
  const integration = await db.integration.findUnique({ where: { provider: 'WHATSAPP' } })
  if (!integration) return null
  const config = parseJSON<any>(integration.config, {})
  return config.appSecret || null
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token && challenge) {
    const ok = await verifyWhatsAppWebhookToken(token)
    if (ok) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response('Forbidden', { status: 403 })
  }
  return new Response('Bad Request', { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    // Get the App Secret for signature verification (if configured)
    const appSecret = await getWhatsAppAppSecret()

    let payload: any

    if (appSecret) {
      // Clone the request so we can both verify the signature AND parse the body
      const sig = req.headers.get('x-hub-signature-256')
      if (!sig || !sig.startsWith('sha256=')) {
        return new Response('Missing signature', { status: 403 })
      }
      const expected = sig.slice(7)
      const rawBody = await req.text()
      const computed = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
      try {
        const a = Buffer.from(expected, 'hex')
        const b = Buffer.from(computed, 'hex')
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          // Log failed verification
          await db.webhookEvent.create({
            data: {
              provider: 'WHATSAPP',
              payload: JSON.stringify({ error: 'signature_verification_failed', expected, computed }),
              processed: false,
            },
          }).catch(() => {})
          return new Response('Invalid signature', { status: 403 })
        }
      } catch {
        return new Response('Invalid signature format', { status: 403 })
      }
      // Parse the raw body we already read
      try {
        payload = JSON.parse(rawBody)
      } catch {
        return new Response('Invalid JSON', { status: 400 })
      }
    } else {
      // No App Secret configured — skip signature verification (not recommended for production)
      payload = await req.json()
    }

    // Idempotency: dedupe on event_id if present
    let eventId: string | undefined
    try {
      eventId = payload?.entry?.[0]?.id || payload?.event_id || undefined
    } catch {}
    if (eventId) {
      const existing = await db.webhookEvent.findFirst({ where: { eventId } })
      if (existing) return Response.json({ status: 'duplicate' })
    }

    await db.webhookEvent.create({
      data: {
        provider: 'WHATSAPP',
        eventId: eventId || null,
        payload: JSON.stringify(payload),
        processed: false,
      },
    })

    // Try to extract inbound message or status update
    const entries = Array.isArray(payload?.entry) ? payload.entry : []
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []
      for (const change of changes) {
        const value = change?.value
        if (!value) continue

        // Inbound message
        const messages = Array.isArray(value?.messages) ? value.messages : []
        for (const msg of messages) {
          const from = msg?.from
          const text = msg?.text?.body || ''
          if (!from) continue
          let lead = await db.lead.findFirst({ where: { whatsapp: from } })
          if (!lead) {
            lead = await db.lead.create({
              data: {
                businessName: `WhatsApp ${from}`,
                whatsapp: from,
                source: 'WhatsApp inbound',
                status: 'NEW',
                tags: '[]',
              },
            })
          }
          let convo = await db.conversation.findFirst({ where: { leadId: lead.id, channel: 'WHATSAPP' } })
          if (!convo) {
            convo = await db.conversation.create({
              data: {
                leadId: lead.id,
                leadName: lead.businessName,
                leadPhone: from,
                channel: 'WHATSAPP',
                status: 'ACTIVE',
                unreadCount: 1,
                lastMessage: text,
                lastMessageAt: new Date(),
              },
            })
          } else {
            await db.conversation.update({
              where: { id: convo.id },
              data: {
                unreadCount: (convo.unreadCount || 0) + 1,
                lastMessage: text,
                lastMessageAt: new Date(),
              },
            })
          }
          await db.message.create({
            data: {
              leadId: lead.id,
              conversationId: convo.id,
              channel: 'WHATSAPP',
              direction: 'INBOUND',
              body: text,
              status: 'DELIVERED',
              messageId: msg.id,
            },
          })
          await db.lead.update({
            where: { id: lead.id },
            data: { lastReplied: new Date(), status: 'REPLIED' },
          })
        }

        // Status update
        const statuses = Array.isArray(value?.statuses) ? value.statuses : []
        for (const st of statuses) {
          const recipientId = st?.id // wamid or providerId of original message
          const status = String(st?.status || '').toUpperCase() // SENT | DELIVERED | READ | FAILED
          if (!recipientId) continue

          // Update matching campaignRecipient (by providerId) or message
          const recip = await db.campaignRecipient.findFirst({ where: { providerId: recipientId } })
          if (recip) {
            const update: any = {}
            if (status === 'SENT') update.sentAt = new Date()
            if (status === 'DELIVERED') update.deliveredAt = new Date()
            if (status === 'READ') update.readAt = new Date()
            if (status === 'FAILED') {
              update.failedAt = new Date()
              update.error = st?.errors?.[0]?.message || 'Failed'
            }
            update.status = ['SENT','DELIVERED','READ','FAILED'].includes(status) ? status : recip.status
            await db.campaignRecipient.update({ where: { id: recip.id }, data: update })
          }
          const msg = await db.message.findFirst({ where: { providerId: recipientId } })
          if (msg) {
            await db.message.update({ where: { id: msg.id }, data: { status } })
          }
        }
      }
    }

    await db.webhookEvent.updateMany({ where: { eventId }, data: { processed: true } })

    return Response.json({ status: 'ok' })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'webhook failed' }, { status: 500 })
  }
}
