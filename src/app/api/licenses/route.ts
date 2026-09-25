import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const productId = url.searchParams.get('productId')
    const where: any = {}
    if (status) where.status = status
    if (productId) where.productId = productId
    const licenses = await db.license.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok({ licenses })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const productId = String(body.productId || '')
    const licenseKey = String(body.licenseKey || '')
    if (!productId || !licenseKey) return badRequest('productId and licenseKey required')
    const product = await db.product.findUnique({ where: { id: productId } })
    const license = await db.license.create({
      data: {
        productId,
        productName: product?.name || null,
        licenseKey,
        licenseData: body.licenseData ? JSON.stringify(body.licenseData) : null,
        supplier: body.supplier || null,
        status: 'AVAILABLE',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })
    return ok({ license })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
