import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const params: any = (ctx as any).params; const id = typeof params?.then === 'function' ? (await params).id : params.id
  const tpl = await db.template.findUnique({ where: { id } })
  if (!tpl) return notFound('Template not found')
  return ok({ template: { ...tpl, variables: parseJSON<string[]>(tpl.variables, []) } })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const params: any = (ctx as any).params; const id = typeof params?.then === 'function' ? (await params).id : params.id
    const body = await req.json()
    const update: any = {}
    for (const k of ['name','channel','language','category','subject','body','approved']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.body !== undefined) update.variables = JSON.stringify([]) // recompute below
    const tpl = await db.template.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'TEMPLATE_UPDATE', entity: 'Template', entityId: id, req })
    return ok({ template: { ...tpl, variables: parseJSON<string[]>(tpl.variables, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const params: any = (ctx as any).params; const id = typeof params?.then === 'function' ? (await params).id : params.id
  await db.template.delete({ where: { id } })
  await writeAuditLog({ user, action: 'TEMPLATE_DELETE', entity: 'Template', entityId: id, req })
  return ok({ success: true })
}
