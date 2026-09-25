// Fulfill an order: deliver licenses for digital products, mark as fulfilled
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError, parseJSON, badRequest } from '@/lib/http'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const order = await db.order.findUnique({ where: { id } })
    if (!order) return notFound('Order not found')
    if (order.paymentStatus !== 'PAID') return badRequest('Order must be paid before fulfillment')
    if (order.fulfillmentStatus === 'FULFILLED' || order.fulfillmentStatus === 'COMPLETED') return badRequest('Order already fulfilled')

    const items = parseJSON<any[]>(order.items, [])
    const deliveredLicenses: any[] = []

    for (const item of items) {
      // Find an available license for this product
      const license = await db.license.findFirst({
        where: { productId: item.productId, status: 'AVAILABLE' },
      })
      if (license) {
        await db.license.update({
          where: { id: license.id },
          data: {
            status: 'DELIVERED',
            orderId: order.id,
            customerId: order.customerId,
            deliveredAt: new Date(),
          },
        })
        deliveredLicenses.push(license)
      }
    }

    await db.order.update({
      where: { id },
      data: { fulfillmentStatus: 'FULFILLED' },
    })

    await writeAuditLog({
      user,
      action: 'ORDER_FULFILLED',
      entity: 'Order',
      entityId: id,
      details: `Order ${order.orderNumber} fulfilled with ${deliveredLicenses.length} license(s)`,
      req,
    })

    return ok({ order: { ...order, items }, deliveredLicenses })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
