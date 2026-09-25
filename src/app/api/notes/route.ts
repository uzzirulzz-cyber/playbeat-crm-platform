// Notes API: GET (by leadId) + POST (create)
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
    if (!leadId) return badRequest('leadId required')
    const notes = await db.note.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return ok({ notes })
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
    const noteBody = String(body.body || '').trim()
    if (!leadId || !noteBody) return badRequest('leadId and body required')

    const note = await db.note.create({
      data: {
        leadId,
        employeeId: user.id,
        employeeName: user.name,
        body: noteBody,
        pinned: !!body.pinned,
      },
    })
    await writeAuditLog({ user, action: 'NOTE_CREATED', entity: 'Lead', entityId: leadId, details: noteBody.slice(0, 100), req })
    return ok({ note })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
