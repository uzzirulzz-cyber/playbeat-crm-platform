import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hasRole, ROLES } from '@/lib/auth'
import { ok, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const settings = await db.setting.findMany({ orderBy: { category: 'asc' } })
    return ok({ settings })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const body = await req.json()
    const items = Array.isArray(body) ? body : [body]
    for (const it of items) {
      if (!it.key || it.value === undefined) continue
      const category = String(it.category || 'SYSTEM').toUpperCase()
      await db.setting.upsert({
        where: { key: it.key },
        update: { value: String(it.value), category },
        create: { key: it.key, value: String(it.value), category },
      })
    }
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
