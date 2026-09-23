import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    })
    return ok({ conversations })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
