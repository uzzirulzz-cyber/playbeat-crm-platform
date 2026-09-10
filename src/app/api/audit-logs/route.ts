import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hasRole, ROLES } from '@/lib/auth'
import { ok, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok({ logs })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
