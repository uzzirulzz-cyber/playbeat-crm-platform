import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { getIntegrationStatus } from '@/lib/providers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const { provider } = await params()
  const row = await db.integration.findUnique({ where: { provider: provider.toUpperCase() } })
  if (!row) return notFound('Integration not found')
  return ok({ integration: { ...row, config: parseJSON(row.config, {}) } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const { provider } = await params()
  await db.integration.update({
    where: { provider: provider.toUpperCase() },
    data: { status: 'DISCONNECTED' },
  }).catch(() => {})
  return ok({ success: true })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  return badRequest('Use POST /api/integrations to configure')
}
