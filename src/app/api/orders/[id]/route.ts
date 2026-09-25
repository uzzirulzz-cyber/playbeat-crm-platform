import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError, parseJSON, badRequest } from '@/lib/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const params: any = (ctx as any).params
  const id = typeof params?.then === 'function' ? (await params).id : params.id
  const order = await db.order.findUnique({ where: { id } }) || await db.order.findUnique({ where: { orderNumber: id } })
  if (!order) return notFound('Order not found')
  const payments = await db.payment.findMany({ where: { orderId: order.id } })
  const licenses = await db.license.findMany({ where: { orderId: order.id } })
  return ok({ order: { ...order, items: parseJSON<any[]>(order.items, []) }, payments, licenses })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    for (const k of ['paymentStatus','fulfillmentStatus','paymentMethod','notes']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    const order = await db.order.update({ where: { id }, data: update })
    return ok({ order: { ...order, items: parseJSON<any[]>(order.items, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
