// Aggregate analytics from real DB data. No fabricated stats.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const [
      totalLeads,
      emailLeads,
      whatsappLeads,
      eligibleEmailLeads,
      eligibleWhatsappLeads,
      activeCampaigns,
      totalMessages,
      sentMessages,
      deliveredMessages,
      readMessages,
      failedMessages,
      inboundMessages,
      unsubscribes,
      conversations,
    ] = await Promise.all([
      db.lead.count(),
      db.lead.count({ where: { email: { not: null } } }),
      db.lead.count({ where: { whatsapp: { not: null } } }),
      db.lead.count({ where: { email: { not: null }, emailOptIn: true, doNotContact: false } }),
      db.lead.count({ where: { whatsapp: { not: null }, whatsappOptIn: true, doNotContact: false } }),
      db.campaign.count({ where: { status: 'RUNNING' } }),
      db.message.count(),
      db.message.count({ where: { status: 'SENT' } }),
      db.message.count({ where: { status: 'DELIVERED' } }),
      db.message.count({ where: { status: 'READ' } }),
      db.message.count({ where: { status: 'FAILED' } }),
      db.message.count({ where: { direction: 'INBOUND' } }),
      db.suppression.count(),
      db.conversation.count(),
    ])

    const leadsByCity = await db.lead.groupBy({ by: ['city'], _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 10 })
    const leadsByCategory = await db.lead.groupBy({ by: ['category'], _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 10 })
    const leadsByStatus = await db.lead.groupBy({ by: ['status'], _count: { _all: true } })

    const recentCampaigns = await db.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const campaigns = recentCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      stats: parseJSON(c.stats, {}),
    }))

    // Messages over time (last 7 days, by day)
    const days: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - i)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const count = await db.message.count({ where: { createdAt: { gte: start, lt: end } } })
      days.push({ date: start.toISOString().slice(0, 10), count })
    }

    return ok({
      totals: {
        totalLeads,
        emailLeads,
        whatsappLeads,
        eligibleEmailLeads,
        eligibleWhatsappLeads,
        activeCampaigns,
        totalMessages,
        sentMessages,
        deliveredMessages,
        readMessages,
        failedMessages,
        inboundMessages,
        unsubscribes,
        conversations,
      },
      charts: {
        leadsByCity: leadsByCity.map((l) => ({ label: l.city || 'Unknown', value: l._count._all })),
        leadsByCategory: leadsByCategory.map((l) => ({ label: l.category || 'Unknown', value: l._count._all })),
        leadsByStatus: leadsByStatus.map((l) => ({ label: l.status, value: l._count._all })),
        messagesOverTime: days,
      },
      campaigns,
    })
  } catch (e: any) {
    return serverError(e?.message || 'Analytics failed')
  }
}
