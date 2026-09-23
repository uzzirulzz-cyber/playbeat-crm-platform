// Email inbox - returns inbound EMAIL messages sorted by most recent first.
// Real IMAP sync would happen in a worker; here we surface stored inbound messages.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const messages = await db.message.findMany({
      where: { channel: 'EMAIL', direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return ok({ messages })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
