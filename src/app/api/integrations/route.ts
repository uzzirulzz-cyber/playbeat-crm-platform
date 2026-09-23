// List integrations and their masked config + status.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { getIntegrationStatus, maskSecret } from '@/lib/providers'
import { getMetaCAPIStatus } from '@/lib/meta-capi'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const rows = await db.integration.findMany()
    // Build virtual rows for all providers regardless of presence in DB
    const result = []
    for (const provider of ['WHATSAPP', 'EMAIL', 'META_CAPI']) {
      const row = rows.find((r) => r.provider === provider)
      const status = provider === 'META_CAPI'
        ? await getMetaCAPIStatus()
        : await getIntegrationStatus(provider as any)
      const config = row ? parseJSON(row.config, {}) : {}
      // Mask secrets in response
      const masked: any = {}
      for (const [k, v] of Object.entries(config)) {
        if (/token|password|secret/i.test(k)) masked[k] = maskSecret(v as string)
        else masked[k] = v
      }
      result.push({
        provider,
        status,
        config: masked,
        lastSync: row?.lastSync || null,
        createdAt: row?.createdAt || null,
        updatedAt: row?.updatedAt || null,
      })
    }
    return ok({ integrations: result })
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
    const provider = String(body.provider || '').toUpperCase()
    if (!['WHATSAPP', 'EMAIL', 'META_CAPI'].includes(provider)) return badRequest('Invalid provider')

    const incoming = body.config || {}
    // Merge with existing config so masked secrets can be preserved
    const existing = await db.integration.findUnique({ where: { provider } })
    const existingConfig = existing ? parseJSON(existing.config, {}) : {}
    const merged: any = {}
    for (const [k, v] of Object.entries(existingConfig)) {
      merged[k] = v
    }
    for (const [k, v] of Object.entries(incoming)) {
      // If a masked secret (contains ****) was sent back unchanged, preserve the original
      if (typeof v === 'string' && v.includes('****')) continue
      merged[k] = v
    }

    const integration = await db.integration.upsert({
      where: { provider },
      update: { config: JSON.stringify(merged), status: 'CONNECTED' },
      create: { provider, config: JSON.stringify(merged), status: 'CONNECTED' },
    })
    await writeAuditLog({ user, action: 'INTEGRATION_UPDATE', entity: 'Integration', entityId: integration.id, details: provider, req })
    return ok({ integration: { provider: integration.provider, status: integration.status, updatedAt: integration.updatedAt } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
