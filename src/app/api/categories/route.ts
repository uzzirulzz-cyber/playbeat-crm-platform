import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
  return ok({ categories })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    if (!name) return badRequest('name required')
    const slug = body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const category = await db.category.create({
      data: {
        name,
        slug,
        description: body.description || null,
        icon: body.icon || null,
        sortOrder: Number(body.sortOrder || 0),
      },
    })
    return ok({ category })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
