// Notifications API: GET (for current user) + POST (create)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const onlyUnread = url.searchParams.get('unread') === 'true'
    const where: any = { userId: user.id }
    if (onlyUnread) where.read = false
    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const unreadCount = await db.notification.count({ where: { userId: user.id, read: false } })
    return ok({ notifications, unreadCount })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const notif = await db.notification.create({
      data: {
        userId: body.userId || user.id,
        type: String(body.type || 'OTHER'),
        title: String(body.title || ''),
        body: body.body || null,
        entityId: body.entityId || null,
        entityType: body.entityType || null,
      },
    })
    return ok({ notification: notif })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
