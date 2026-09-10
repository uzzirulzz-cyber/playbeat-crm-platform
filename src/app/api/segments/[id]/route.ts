import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { filterLeads } from '@/lib/campaign-worker'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const { id } = await params()
  const segment = await db.segment.findUnique({ where: { id } })
  if (!segment) return notFound('Segment not found')
  const filters = parseJSON(segment.filters, {})
  const leads = await filterLeads(filters)
  return ok({
    segment: { ...segment, filters },
    leads,
    count: leads.length,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const { id } = await params()
    const body = await req.json()
    const seg = await db.segment.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        filters: JSON.stringify(body.filters || {}),
      },
    })
    await writeAuditLog({ user, action: 'SEGMENT_UPDATE', entity: 'Segment', entityId: id, req })
    return ok({ segment: { ...seg, filters: parseJSON(seg.filters, {}) } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.ADMIN)) return forbiddenResponse()
  const { id } = await params()
  await db.segment.delete({ where: { id } })
  await writeAuditLog({ user, action: 'SEGMENT_DELETE', entity: 'Segment', entityId: id, req })
  return ok({ success: true })
}
