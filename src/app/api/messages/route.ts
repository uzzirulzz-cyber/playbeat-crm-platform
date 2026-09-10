import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const channel = url.searchParams.get('channel') || undefined
    const direction = url.searchParams.get('direction') || undefined
    const leadId = url.searchParams.get('leadId') || undefined
    const campaignId = url.searchParams.get('campaignId') || undefined

    const where: any = {}
    if (channel) where.channel = channel
    if (direction) where.direction = direction
    if (leadId) where.leadId = leadId
    if (campaignId) where.campaignId = campaignId

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return ok({ messages })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
