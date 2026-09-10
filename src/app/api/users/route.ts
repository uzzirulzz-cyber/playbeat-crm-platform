// Users CRUD - admin only.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES, hashPassword } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } })
  return ok({ users: users.map((u) => ({ ...u, password: undefined })) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim()
    const password = String(body.password || '')
    const role = String(body.role || 'VIEWER').toUpperCase()
    if (!email || !name || !password) return badRequest('email, name, password required')
    if (!Object.values(ROLES).includes(role as any)) return badRequest('Invalid role')

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return badRequest('Email already in use')

    const u = await db.user.create({
      data: {
        email,
        name,
        password: await hashPassword(password),
        role,
        active: body.active !== false,
      },
    })
    await writeAuditLog({ user, action: 'USER_CREATE', entity: 'User', entityId: u.id, details: email, req })
    return ok({ user: { ...u, password: undefined } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
