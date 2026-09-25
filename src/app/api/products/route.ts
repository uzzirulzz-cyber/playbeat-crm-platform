import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest) {
  // Public: list active products with optional filters
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const type = url.searchParams.get('type')
    const search = url.searchParams.get('search')
    const featured = url.searchParams.get('featured') === 'true'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)

    const where: any = { status: 'ACTIVE', visibility: 'PUBLIC' }
    if (category) where.categoryName = category
    if (type) where.type = type.toUpperCase()
    if (featured) where.featured = true
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return ok({ products: products.map(p => ({
      ...p,
      images: parseJSON<string[]>(p.images, []),
      variants: parseJSON<any[]>(p.variants, []),
    })) })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  // Admin only: create product
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    if (!name) return badRequest('name required')
    const slug = body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const product = await db.product.create({
      data: {
        name,
        slug,
        description: body.description || null,
        longDescription: body.longDescription || null,
        categoryId: body.categoryId || null,
        categoryName: body.categoryName || null,
        price: Number(body.price || 0),
        salePrice: body.salePrice ? Number(body.salePrice) : null,
        cost: body.cost ? Number(body.cost) : null,
        currency: body.currency || 'PKR',
        type: body.type || 'DIGITAL',
        deliveryType: body.deliveryType || 'INSTANT',
        stock: Number(body.stock || 0),
        unlimited: !!body.unlimited,
        licenseSource: body.licenseSource || null,
        images: JSON.stringify(body.images || []),
        variants: JSON.stringify(body.variants || []),
        status: body.status || 'ACTIVE',
        featured: !!body.featured,
        visibility: body.visibility || 'PUBLIC',
      },
    })
    return ok({ product })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
