// Followups API: GET (by leadId, employeeId, status, or all upcoming) + POST
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const leadId = url.searchParams.get('leadId')
    const employeeId = url.searchParams.get('employeeId')
    const status = url.searchParams.get('status')
    const upcoming = url.searchParams.get('upcoming') === 'true'

    const where: any = {}
    if (leadId) where.leadId = leadId
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status
    if (upcoming) {
      where.scheduledAt = { gte: new Date() }
      where.status = 'SCHEDULED'
    }

    const followups = await db.followup.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      take: 200,
    })
    return ok({ followups })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const leadId = String(body.leadId || '')
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    if (!leadId || !scheduledAt) return badRequest('leadId and scheduledAt required')

    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { businessName: true } })
    const followup = await db.followup.create({
      data: {
        leadId,
        leadName: lead?.businessName || null,
        employeeId: user.id,
        employeeName: user.name,
        scheduledAt,
        channel: body.channel || 'WHATSAPP',
        status: 'SCHEDULED',
        notes: body.notes || null,
        callId: body.callId || null,
      },
    })
    await writeAuditLog({ user, action: 'FOLLOWUP_CREATED', entity: 'Followup', entityId: followup.id, details: `Lead ${leadId} at ${scheduledAt.toISOString()}`, req })
    return ok({ followup })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
