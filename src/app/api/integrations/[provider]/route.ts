import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { getIntegrationStatus } from '@/lib/providers'

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> | { provider: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const params: any = (ctx as any).params; const provider = typeof params?.then === 'function' ? (await params).provider : params.provider
  const row = await db.integration.findUnique({ where: { provider: provider.toUpperCase() } })
  if (!row) return notFound('Integration not found')
  return ok({ integration: { ...row, config: parseJSON(row.config, {}) } })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ provider: string }> | { provider: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const params: any = (ctx as any).params; const provider = typeof params?.then === 'function' ? (await params).provider : params.provider
  await db.integration.update({
    where: { provider: provider.toUpperCase() },
    data: { status: 'DISCONNECTED' },
  }).catch(() => {})
  return ok({ success: true })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> | { provider: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  return badRequest('Use POST /api/integrations to configure')
}
