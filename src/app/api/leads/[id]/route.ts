import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const { id } = await params()
  const lead = await db.lead.findUnique({ where: { id } })
  if (!lead) return notFound('Lead not found')
  return ok({ lead: { ...lead, tags: parseJSON<string[]>(lead.tags, []) } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.AGENT)) return forbiddenResponse()
  try {
    const { id } = await params()
    const body = await req.json()
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return notFound('Lead not found')

    const update: any = {}
    for (const k of ['businessName','contactPerson','email','whatsapp','country','state','city','category','website','source','notes','status']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (body.tags !== undefined) update.tags = JSON.stringify(body.tags)
    if (body.score !== undefined) update.score = Number(body.score)
    for (const k of ['emailVerified','whatsappAvailable','emailOptIn','whatsappOptIn','doNotContact']) {
      if (body[k] !== undefined) update[k] = !!body[k]
    }
    update.updatedAt = new Date()

    const lead = await db.lead.update({ where: { id }, data: update })
    await writeAuditLog({ user, action: 'LEAD_UPDATE', entity: 'Lead', entityId: id, req })
    return ok({ lead: { ...lead, tags: parseJSON<string[]>(lead.tags, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Update failed')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  try {
    const { id } = await params()
    await db.lead.delete({ where: { id } })
    await writeAuditLog({ user, action: 'LEAD_DELETE', entity: 'Lead', entityId: id, req })
    return ok({ success: true })
  } catch (e: any) {
    return serverError(e?.message || 'Delete failed')
  }
}
