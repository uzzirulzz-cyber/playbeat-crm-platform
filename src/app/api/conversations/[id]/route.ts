import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const { id } = await params()
    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) return notFound('Conversation not found')
    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 500,
    })
    // Mark as read
    await db.conversation.update({ where: { id }, data: { unreadCount: 0 } })
    return ok({ conversation, messages })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
