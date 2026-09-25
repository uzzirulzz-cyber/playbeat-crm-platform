import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError, parseJSON, badRequest } from '@/lib/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const params: any = (ctx as any).params
  const id = typeof params?.then === 'function' ? (await params).id : params.id
  const product = await db.product.findUnique({ where: { id } }) || await db.product.findUnique({ where: { slug: id } })
  if (!product) return notFound('Product not found')
  return ok({ product: { ...product, images: parseJSON<string[]>(product.images, []), variants: parseJSON<any[]>(product.variants, []) } })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    for (const k of ['name','description','longDescription','categoryId','categoryName','currency','type','deliveryType','licenseSource','status','visibility']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    for (const k of ['price','salePrice','cost','stock']) {
      if (body[k] !== undefined) update[k] = Number(body[k])
    }
    for (const k of ['unlimited','featured']) {
      if (body[k] !== undefined) update[k] = !!body[k]
    }
    if (body.images !== undefined) update.images = JSON.stringify(body.images)
    if (body.variants !== undefined) update.variants = JSON.stringify(body.variants)
    if (body.slug) update.slug = body.slug
    const product = await db.product.update({ where: { id }, data: update })
    return ok({ product: { ...product, images: parseJSON<string[]>(product.images, []), variants: parseJSON<any[]>(product.variants, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    await db.product.delete({ where: { id } })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
