import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs' // legacy hash verification only (pre-Workers installs)
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'leadpulse-default-jwt-secret-2026'
const secretKey = new TextEncoder().encode(JWT_SECRET)
const TOKEN_COOKIE = 'lp_token'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7d

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

// ---------------------------------------------------------------------------
// Password hashing — PBKDF2-SHA256 via Web Crypto (Workers-compatible).
// Format: pbkdf2$<iterations>$<saltB64>$<hashB64>
// Legacy bcrypt hashes ($2a/$2b/$2y) from older installs still verify.
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000
const HASH_KEY_BITS = 256

function b64encode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < view.length; i++) bin += String.fromCharCode(view[i])
  return btoa(bin)
}

function b64decode(value: string): Uint8Array {
  const bin = atob(value)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function pbkdf2Derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    HASH_KEY_BITS
  )
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await pbkdf2Derive(plain, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64encode(salt)}$${b64encode(derived)}`
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith('pbkdf2$')) {
      const [, iterStr, saltB64, hashB64] = stored.split('$')
      const iterations = parseInt(iterStr, 10) || PBKDF2_ITERATIONS
      const derived = new Uint8Array(await pbkdf2Derive(plain, b64decode(saltB64), iterations))
      return timingSafeEqual(derived, b64decode(hashB64))
    }
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      return await bcrypt.compare(plain, stored)
    }
    return false
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// JWT — HS256 via jose (Workers-compatible).
// ---------------------------------------------------------------------------
export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ id: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey)
}

export async function verifyTokenAsync(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return {
      id: String(payload.id || ''),
      email: String(payload.email || ''),
      name: String(payload.name || ''),
      role: String(payload.role || 'VIEWER'),
    }
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
    maxAge: TOKEN_TTL_SECONDS,
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
  const user = await verifyTokenAsync(token)
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
