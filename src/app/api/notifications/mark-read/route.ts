// Mark all unread notifications as read for the current user
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const result = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    return ok({ updated: result.count })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
