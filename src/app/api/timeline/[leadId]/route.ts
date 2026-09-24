// Unified CRM timeline for a lead: messages, calls, notes, tasks, followups, status changes
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest, ctx: { params: Promise<{ leadId: string }> | { leadId: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const leadId = typeof params?.then === 'function' ? (await params).leadId : params.leadId

    const [lead, messages, calls, notes, tasks, followups, auditLogs] = await Promise.all([
      db.lead.findUnique({ where: { id: leadId } }),
      db.message.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } }),
      db.call.findMany({ where: { leadId }, orderBy: { startedAt: 'asc' } }),
      db.note.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } }),
      db.task.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } }),
      db.followup.findMany({ where: { leadId }, orderBy: { scheduledAt: 'asc' } }),
      db.auditLog.findMany({
        where: { entityId: leadId, entity: 'Lead' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ])

    type Event = {
      id: string
      type: string
      timestamp: Date
      title: string
      description?: string
      meta?: any
    }
    const events: Event[] = []

    // Lead creation event
    if (lead) {
      events.push({
        id: `lead_${lead.id}`,
        type: 'CUSTOMER_CREATED',
        timestamp: lead.createdAt,
        title: 'Customer created',
        description: `Source: ${lead.source || 'Manual'}`,
      })
      if (lead.assignedAt) {
        events.push({
          id: `assign_${lead.id}`,
          type: 'ASSIGNMENT',
          timestamp: lead.assignedAt,
          title: `Assigned to ${lead.assignedToName || 'employee'}`,
        })
      }
    }

    // Messages
    for (const m of messages) {
      events.push({
        id: `msg_${m.id}`,
        type: m.direction === 'INBOUND' ? 'MESSAGE_RECEIVED' : 'MESSAGE_SENT',
        timestamp: m.createdAt,
        title: m.direction === 'INBOUND' ? `${m.channel} message received` : `${m.channel} message sent`,
        description: m.body,
        meta: { channel: m.channel, status: m.status, subject: m.subject, campaignId: m.campaignId },
      })
    }

    // Calls
    for (const c of calls) {
      events.push({
        id: `call_${c.id}`,
        type: c.direction === 'INBOUND' ? 'INCOMING_CALL' : 'OUTBOUND_CALL',
        timestamp: c.startedAt,
        title: `${c.direction === 'INBOUND' ? 'Incoming' : 'Outbound'} call`,
        description: `Duration: ${c.durationSec}s, outcome: ${c.outcome || '—'}${c.outcomeNotes ? ` — ${c.outcomeNotes}` : ''}`,
        meta: { duration: c.durationSec, outcome: c.outcome, employee: c.employeeName },
      })
    }

    // Notes
    for (const n of notes) {
      events.push({
        id: `note_${n.id}`,
        type: 'NOTE',
        timestamp: n.createdAt,
        title: `Note added by ${n.employeeName || 'employee'}`,
        description: n.body,
        meta: { pinned: n.pinned },
      })
    }

    // Tasks
    for (const t of tasks) {
      events.push({
        id: `task_${t.id}`,
        type: 'TASK',
        timestamp: t.createdAt,
        title: `Task: ${t.title}`,
        description: t.description || undefined,
        meta: { status: t.status, priority: t.priority, dueDate: t.dueDate, employee: t.employeeName },
      })
    }

    // Followups
    for (const f of followups) {
      events.push({
        id: `followup_${f.id}`,
        type: 'FOLLOWUP',
        timestamp: f.scheduledAt,
        title: `Follow-up scheduled (${f.channel})`,
        description: f.notes || undefined,
        meta: { status: f.status, employee: f.employeeName },
      })
    }

    // Audit log entries (status changes, etc.)
    for (const a of auditLogs) {
      if (['LEAD_UPDATE', 'LEAD_CREATE', 'LEAD_DELETE'].includes(a.action)) {
        events.push({
          id: `audit_${a.id}`,
          type: 'STATUS_CHANGE',
          timestamp: a.createdAt,
          title: a.action.replace(/_/g, ' ').toLowerCase(),
          description: a.details || undefined,
          meta: { user: a.userName, action: a.action },
        })
      }
    }

    // Sort newest first
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Group by day
    const grouped: { date: string; events: Event[] }[] = []
    for (const ev of events) {
      const dayKey = ev.timestamp.toISOString().slice(0, 10)
      let group = grouped.find((g) => g.date === dayKey)
      if (!group) {
        group = { date: dayKey, events: [] }
        grouped.push(group)
      }
      group.events.push(ev)
    }

    return ok({
      lead: lead ? { ...lead, tags: parseJSON<string[]>(lead.tags, []) } : null,
      timeline: grouped,
      totalCount: events.length,
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
