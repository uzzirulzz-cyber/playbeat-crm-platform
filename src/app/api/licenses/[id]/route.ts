import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const params: any = (ctx as any).params
  const id = typeof params?.then === 'function' ? (await params).id : params.id
  const license = await db.license.findUnique({ where: { id } })
  if (!license) return Response.json({ error: 'License not found' }, { status: 404 })
  return ok({ license })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    for (const k of ['status','supplier']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.expiresAt !== undefined) update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    const license = await db.license.update({ where: { id }, data: update })
    return ok({ license })
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
    await db.license.delete({ where: { id } })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
