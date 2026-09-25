import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signToken, setAuthCookie, clearAuthCookie, writeAuditLog, type AuthUser } from '@/lib/auth'
import { ok, badRequest, serverError } from '@/lib/http'
import { ensureDbInitialized } from '@/lib/db-init'

export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!email || !password) return badRequest('Email and password required')

    const user = await db.user.findUnique({ where: { email } })
    if (!user) return badRequest('Invalid credentials')
    if (!user.active) return badRequest('Account disabled')
    const valid = await verifyPassword(password, user.password)
    if (!valid) return badRequest('Invalid credentials')

    const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role }
    const token = signToken(authUser)
    await setAuthCookie(token)
    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
    await writeAuditLog({ user: authUser, action: 'LOGIN', entity: 'User', entityId: user.id, req })

    return ok({ user: authUser })
  } catch (e: any) {
    return serverError(e?.message || 'Login failed')
  }
}

export async function DELETE() {
  try {
    await clearAuthCookie()
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Logout failed')
  }
}
