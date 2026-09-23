import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, parseJSON } from '@/lib/http'
import { filterLeads } from '@/lib/campaign-worker'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  const segments = await db.segment.findMany({ orderBy: { createdAt: 'desc' } })
  return ok({ segments: segments.map((s) => ({ ...s, filters: parseJSON(s.filters, {}) })) })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    if (!name) return badRequest('Name required')
    const seg = await db.segment.create({
      data: {
        name,
        description: body.description || null,
        filters: JSON.stringify(body.filters || {}),
      },
    })
    await writeAuditLog({ user, action: 'SEGMENT_CREATE', entity: 'Segment', entityId: seg.id, details: name, req })
    return ok({ segment: { ...seg, filters: parseJSON(seg.filters, {}) } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

// Preview how many leads a filter spec matches
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const filters = body.filters || {}
    const leads = await filterLeads(filters)
    return ok({ count: leads.length })
  } catch (e: any) {
    return serverError(e?.message || 'Preview failed')
  }
}
