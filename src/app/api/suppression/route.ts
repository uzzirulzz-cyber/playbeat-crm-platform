import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const suppressions = await db.suppression.findMany({ orderBy: { createdAt: 'desc' } })
  return ok({ suppressions })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.AGENT)) return forbiddenResponse()
  try {
    const body = await req.json()
    const type = String(body.type || '').toUpperCase()
    const value = String(body.value || '').trim()
    const reason = String(body.reason || 'MANUAL').toUpperCase()
    if (!type || !value) return badRequest('type and value required')
    if (!['EMAIL','WHATSAPP','GLOBAL'].includes(type)) return badRequest('Invalid type')

    try {
      const s = await db.suppression.create({
        data: {
          type,
          value: type === 'EMAIL' ? value.toLowerCase() : value,
          reason,
        },
      })
      await writeAuditLog({ user, action: 'SUPPRESSION_ADD', entity: 'Suppression', entityId: s.id, details: `${type}:${value}`, req })
      return ok({ suppression: s })
    } catch (e: any) {
      // unique constraint - already suppressed
      return ok({ alreadySuppressed: true })
    }
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
