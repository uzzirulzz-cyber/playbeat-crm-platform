// Inbox API: unified view of all conversations + leads + recent calls
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const filter = url.searchParams.get('filter') || 'all'
    const search = url.searchParams.get('search') || ''

    // Build unified inbox items: conversations + leads without conversations + recent missed calls
    const conversations = await db.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    })

    // Lookup the lead for each conversation in parallel
    const items: any[] = []
    for (const c of conversations) {
      const lead = c.leadId ? await db.lead.findUnique({ where: { id: c.leadId } }) : null
      items.push({
        kind: 'conversation',
        id: c.id,
        leadId: c.leadId,
        name: c.leadName || lead?.businessName || c.leadPhone || 'Unknown',
        company: lead?.businessName || null,
        phone: c.leadPhone,
        email: lead?.email || null,
        avatar: (c.leadName || '?').charAt(0).toUpperCase(),
        lastMessage: c.lastMessage || '',
        lastActivity: c.lastMessageAt || c.createdAt,
        unreadCount: c.unreadCount || 0,
        channel: c.channel,
        status: c.status,
        leadStatus: lead?.status || null,
        city: lead?.city || null,
        country: lead?.country || null,
        assignedTo: lead?.assignedToName || null,
        online: false, // would require socket.io presence
        tags: lead ? JSON.parse(lead.tags || '[]') : [],
      })
    }

    // Apply filter
    let filtered = items
    if (filter === 'unread') filtered = items.filter((i) => i.unreadCount > 0)
    else if (filter === 'whatsapp') filtered = items.filter((i) => i.channel === 'WHATSAPP')
    else if (filter === 'assigned_to_me') filtered = items.filter((i) => i.assignedTo === user.name)
    else if (filter === 'new_leads') {
      // Show leads with status NEW that have no conversation yet
      const newLeads = await db.lead.findMany({ where: { status: 'NEW' }, orderBy: { createdAt: 'desc' }, take: 50 })
      for (const l of newLeads) {
        const existing = items.find((i) => i.leadId === l.id)
        if (!existing) {
          filtered.push({
            kind: 'lead',
            id: l.id,
            leadId: l.id,
            name: l.businessName,
            company: l.businessName,
            phone: l.whatsapp || l.phone,
            email: l.email,
            avatar: (l.businessName || '?').charAt(0).toUpperCase(),
            lastMessage: 'New lead — no conversation yet',
            lastActivity: l.createdAt,
            unreadCount: 0,
            channel: l.whatsapp ? 'WHATSAPP' : 'OTHER',
            status: 'NEW',
            leadStatus: l.status,
            city: l.city,
            country: l.country,
            assignedTo: l.assignedToName,
            online: false,
            tags: JSON.parse(l.tags || '[]'),
          })
        }
      }
    } else if (filter === 'follow_up') {
      // Show leads with status FOLLOW_UP
      const fLeads = await db.lead.findMany({ where: { status: 'FOLLOW_UP' }, take: 50 })
      for (const l of fLeads) {
        filtered.push({
          kind: 'lead',
          id: l.id,
          leadId: l.id,
          name: l.businessName,
          company: l.businessName,
          phone: l.whatsapp || l.phone,
          email: l.email,
          avatar: (l.businessName || '?').charAt(0).toUpperCase(),
          lastMessage: 'Needs follow-up',
          lastActivity: l.createdAt,
          unreadCount: 0,
          channel: l.whatsapp ? 'WHATSAPP' : 'OTHER',
          status: 'FOLLOW_UP',
          leadStatus: l.status,
          city: l.city,
          country: l.country,
          assignedTo: l.assignedToName,
          online: false,
          tags: JSON.parse(l.tags || '[]'),
        })
      }
    }

    // Search filter
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((i) =>
        (i.name || '').toLowerCase().includes(s) ||
        (i.company || '').toLowerCase().includes(s) ||
        (i.phone || '').toLowerCase().includes(s) ||
        (i.email || '').toLowerCase().includes(s)
      )
    }

    // Sort by lastActivity desc
    filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())

    return ok({ items: filtered, total: filtered.length })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
