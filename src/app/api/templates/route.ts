import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { extractVariables } from '@/lib/template'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const url = new URL(req.url)
  const channel = url.searchParams.get('channel') || undefined
  const where: any = {}
  if (channel) where.channel = channel.toUpperCase()
  const templates = await db.template.findMany({ where, orderBy: { createdAt: 'desc' } })
  return ok({
    templates: templates.map((t) => ({
      ...t,
      variables: parseJSON<string[]>(t.variables, []),
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    if (!name) return badRequest('Template name required')
    const channel = String(body.channel || 'EMAIL').toUpperCase()
    const body_text = String(body.body || '')
    const tpl = await db.template.create({
      data: {
        name,
        channel,
        language: body.language || 'en',
        category: body.category || 'MARKETING',
        subject: body.subject || null,
        body: body_text,
        variables: JSON.stringify(extractVariables(body_text)),
        approved: !!body.approved,
      },
    })
    await writeAuditLog({ user, action: 'TEMPLATE_CREATE', entity: 'Template', entityId: tpl.id, details: name, req })
    return ok({ template: { ...tpl, variables: parseJSON<string[]>(tpl.variables, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
