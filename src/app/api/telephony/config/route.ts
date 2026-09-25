// Telephony config: GET status + POST save
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { getTelephonyStatus, maskSecret } from '@/lib/telephony'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const status = await getTelephonyStatus()
    const integration = await db.integration.findUnique({ where: { provider: 'TELEPHONY' } })
    const config = integration ? parseJSON<any>(integration.config, {}) : {}
    // Mask secrets
    const masked: any = {}
    for (const [k, v] of Object.entries(config)) {
      if (/secret|password|token|sid/i.test(k)) masked[k] = maskSecret(v as string)
      else masked[k] = v
    }
    return ok({ status, config: masked })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, 'ADMIN')) return forbiddenResponse()
  try {
    const body = await req.json()
    const provider = String(body.provider || 'mock').toLowerCase()
    if (!['mock', 'twilio', 'vonage'].includes(provider)) return badRequest('Invalid provider')

    const incoming = body.config || {}
    const existing = await db.integration.findUnique({ where: { provider: 'TELEPHONY' } })
    const existingConfig = existing ? parseJSON(existing.config, {}) : {}
    const merged: any = { ...existingConfig }
    for (const [k, v] of Object.entries(incoming)) {
      if (typeof v === 'string' && v.includes('****')) continue
      merged[k] = v
    }
    merged.provider = provider

    const integration = await db.integration.upsert({
      where: { provider: 'TELEPHONY' },
      update: { config: JSON.stringify(merged), status: 'CONNECTED' },
      create: { provider: 'TELEPHONY', config: JSON.stringify(merged), status: 'CONNECTED' },
    })
    await writeAuditLog({ user, action: 'INTEGRATION_UPDATE', entity: 'Integration', entityId: integration.id, details: `TELEPHONY (${provider})`, req })
    return ok({ integration: { provider: integration.provider, status: integration.status } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
