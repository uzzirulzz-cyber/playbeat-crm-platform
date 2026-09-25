// Payments API: GET list + POST record payment for an order
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: any = {}
    if (status) where.status = status
    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok({ payments })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  // Record a payment for an order (called after payment gateway callback)
  try {
    const body = await req.json()
    const orderId = String(body.orderId || '')
    if (!orderId) return badRequest('orderId required')
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return badRequest('Order not found')

    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(body.amount || order.total),
        currency: body.currency || order.currency,
        method: body.method || order.paymentMethod || 'CARD',
        status: body.status || 'PAID',
        provider: body.provider || null,
        providerTxnId: body.providerTxnId || null,
        providerResponse: body.providerResponse ? JSON.stringify(body.providerResponse) : null,
      },
    })

    // If payment is PAID, update order payment status
    if (payment.status === 'PAID') {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PAID' },
      })
    }

    const user = await getCurrentUser(req)
    if (user) {
      await writeAuditLog({
        user,
        action: 'PAYMENT_RECORDED',
        entity: 'Payment',
        entityId: payment.id,
        details: `${payment.method} ${payment.amount} ${payment.currency} for ${order.orderNumber} (${payment.status})`,
        req,
      })
    }

    return ok({ payment, order: await db.order.findUnique({ where: { id: order.id } }) })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
