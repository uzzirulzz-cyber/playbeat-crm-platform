// Call history: GET /api/calls/history?direction=&status=&outcome=&employeeId=&from=&to=
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const direction = url.searchParams.get('direction')
    const status = url.searchParams.get('status')
    const outcome = url.searchParams.get('outcome')
    const employeeId = url.searchParams.get('employeeId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: any = {}
    if (direction) where.direction = direction
    if (status) where.status = status
    if (outcome) where.outcome = outcome
    if (employeeId) where.employeeId = employeeId
    if (from || to) {
      where.startedAt = {}
      if (from) where.startedAt.gte = new Date(from)
      if (to) where.startedAt.lte = new Date(to)
    }

    const [calls, total] = await Promise.all([
      db.call.findMany({ where, orderBy: { startedAt: 'desc' }, take: 500 }),
      db.call.count({ where }),
    ])

    // Aggregate counts for the tabs
    const all = await db.call.count()
    const incoming = await db.call.count({ where: { direction: 'INBOUND' } })
    const outgoing = await db.call.count({ where: { direction: 'OUTBOUND' } })
    const missed = await db.call.count({ where: { status: 'MISSED' } })
    const voicemail = await db.call.count({ where: { status: 'VOICEMAIL' } })

    return ok({ calls, total, counts: { all, incoming, outgoing, missed, voicemail } })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
