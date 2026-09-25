import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const paymentStatus = url.searchParams.get('paymentStatus')
    const fulfillmentStatus = url.searchParams.get('fulfillmentStatus')
    const where: any = {}
    if (status) where.fulfillmentStatus = status
    if (paymentStatus) where.paymentStatus = paymentStatus
    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok({ orders: orders.map(o => ({ ...o, items: parseJSON<any[]>(o.items, []) })) })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  // Public: create order from storefront checkout
  try {
    const body = await req.json()
    const items = body.items || []
    if (!items.length) return badRequest('items required')

    const orderNumber = `PB-${Date.now().toString(36).toUpperCase()}`
    const subtotal = items.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0)
    const total = subtotal - (body.discount || 0) + (body.tax || 0) + (body.shipping || 0)

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: body.customerId || null,
        customerName: body.customerName || null,
        customerEmail: body.customerEmail || null,
        customerPhone: body.customerPhone || null,
        customerWhatsapp: body.customerWhatsapp || null,
        items: JSON.stringify(items),
        subtotal,
        discount: body.discount || 0,
        tax: body.tax || 0,
        shipping: body.shipping || 0,
        total,
        currency: body.currency || 'PKR',
        paymentMethod: body.paymentMethod || null,
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'NEW',
        source: body.source || 'STOREFRONT',
        notes: body.notes || null,
      },
    })

    // If customer email/phone matches a Lead, link the order
    if (body.customerEmail || body.customerWhatsapp) {
      const lead = await db.lead.findFirst({
        where: {
          OR: [
            ...(body.customerEmail ? [{ email: body.customerEmail.toLowerCase() }] : []),
            ...(body.customerWhatsapp ? [{ whatsapp: body.customerWhatsapp }] : []),
          ].filter(Boolean) as any,
        },
      })
      if (lead) {
        await db.order.update({ where: { id: order.id }, data: { customerId: lead.id } })
      }
    }

    return ok({ order: { ...order, items } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
