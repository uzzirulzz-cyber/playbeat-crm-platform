// List integrations and their masked config + status.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { getIntegrationStatus, maskSecret } from '@/lib/providers'
import { getMetaCAPIStatus } from '@/lib/meta-capi'
import { getTelephonyStatus } from '@/lib/telephony'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const rows = await db.integration.findMany()
    // Build virtual rows for all providers regardless of presence in DB.
    // For WHATSAPP, return one entry per connected account (default + any
    // secondary accounts like "jungleofdestiny") instead of a single row.
    const result = []
    const whatsAppAccounts = Array.from(new Set(['default', ...rows.filter((r) => r.provider === 'WHATSAPP').map((r) => r.account)]))
    for (const provider of ['WHATSAPP', 'EMAIL', 'META_CAPI', 'TELEPHONY']) {
      if (provider === 'WHATSAPP') {
        for (const account of whatsAppAccounts) {
          const row = rows.find((r) => r.provider === 'WHATSAPP' && r.account === account)
          const status = await getIntegrationStatus('WHATSAPP', account)
          const config = row ? parseJSON(row.config, {}) : {}
          const masked: any = {}
          for (const [k, v] of Object.entries(config)) {
            if (/token|password|secret|sid/i.test(k)) masked[k] = maskSecret(v as string)
            else masked[k] = v
          }
          result.push({
            provider,
            account,
            status,
            config: masked,
            lastSync: row?.lastSync || null,
            createdAt: row?.createdAt || null,
            updatedAt: row?.updatedAt || null,
          })
        }
        continue
      }
      const row = rows.find((r) => r.provider === provider)
      let status: 'CONNECTED' | 'DISCONNECTED'
      if (provider === 'META_CAPI') {
        status = await getMetaCAPIStatus()
      } else if (provider === 'TELEPHONY') {
        const t = await getTelephonyStatus()
        status = t.connected ? 'CONNECTED' : 'DISCONNECTED'
      } else {
        status = await getIntegrationStatus(provider as any)
      }
      const config = row ? parseJSON(row.config, {}) : {}
      // Mask secrets in response
      const masked: any = {}
      for (const [k, v] of Object.entries(config)) {
        if (/token|password|secret|sid/i.test(k)) masked[k] = maskSecret(v as string)
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
    if (!['WHATSAPP', 'EMAIL', 'META_CAPI', 'TELEPHONY'].includes(provider)) return badRequest('Invalid provider')
    // account lets WHATSAPP have multiple connected numbers (e.g. "default" for
    // the main clinic number, "jungleofdestiny" for the second site/worker).
    // Ignored for providers that don't support multiple accounts.
    const account = provider === 'WHATSAPP' ? String(body.account || 'default') : 'default'

    const incoming = body.config || {}
    // Merge with existing config so masked secrets can be preserved
    const existing = await db.integration.findUnique({ where: { provider_account: { provider, account } } })
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
      where: { provider_account: { provider, account } },
      update: { config: JSON.stringify(merged), status: 'CONNECTED' },
      create: { provider, account, config: JSON.stringify(merged), status: 'CONNECTED' },
    })
    await writeAuditLog({ user, action: 'INTEGRATION_UPDATE', entity: 'Integration', entityId: integration.id, details: `${provider}:${account}`, req })
    return ok({ integration: { provider: integration.provider, account: integration.account, status: integration.status, updatedAt: integration.updatedAt } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
