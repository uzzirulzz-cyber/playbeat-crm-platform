import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'leadpulse-default-jwt-secret-2026'
const TOKEN_COOKIE = 'lp_token'
const TOKEN_TTL = '7d'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    return decoded
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_COOKIE)
}

export async function getTokenFromRequest(req: NextRequest): Promise<string | undefined> {
  const token = req.cookies.get(TOKEN_COOKIE)?.value
  if (token) return token
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return undefined
}

export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const token = await getTokenFromRequest(req)
  if (!token) return null
  const user = verifyToken(token)
  if (!user) return null
  const dbUser = await db.user.findUnique({ where: { id: user.id } })
  if (!dbUser || !dbUser.active) return null
  return user
}

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CAMPAIGN_MANAGER: 'CAMPAIGN_MANAGER',
  AGENT: 'AGENT',
  VIEWER: 'VIEWER',
} as const

export type RoleKey = keyof typeof ROLES

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 1,
  AGENT: 2,
  CAMPAIGN_MANAGER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
}

export function hasRole(user: AuthUser | null, minRole: string): boolean {
  if (!user) return false
  return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0)
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export async function writeAuditLog(params: {
  user?: AuthUser | null
  action: string
  entity: string
  entityId?: string
  details?: string
  req?: NextRequest
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.user?.id,
        userName: params.user?.name,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ip: params.req?.headers.get('x-forwarded-for') || undefined,
      },
    })
  } catch (e) {
    // audit logging failures should never break the request
    console.error('audit log failed:', e)
  }
}
