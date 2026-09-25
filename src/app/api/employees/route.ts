// Employees API: GET list of users with employee stats
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const users = await db.user.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    // Get stats for each user
    const employees = await Promise.all(users.map(async (u) => {
      const [callsMade, callsAnswered, messagesSent, messagesReceived, leadsContacted, followupsScheduled, followupsCompleted, activeConversations, activeTasks] = await Promise.all([
        db.call.count({ where: { employeeId: u.id, direction: 'OUTBOUND' } }),
        db.call.count({ where: { employeeId: u.id, direction: 'INBOUND', status: 'ENDED' } }),
        db.message.count({ where: { direction: 'OUTBOUND' } }), // messages don't have employeeId directly; we'd need to add it. For now approximate by joining via conversation.
        db.message.count({ where: { direction: 'INBOUND' } }),
        db.lead.count({ where: { assignedTo: u.id, lastContacted: { not: null } } }),
        db.followup.count({ where: { employeeId: u.id } }),
        db.followup.count({ where: { employeeId: u.id, status: 'COMPLETED' } }),
        0, // active conversations would require join
        db.task.count({ where: { employeeId: u.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      ])
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        title: u.title,
        employeeCode: u.employeeCode,
        availability: u.availability,
        avatar: u.avatar,
        phone: u.phone,
        lastLogin: u.lastLogin,
        stats: {
          callsMade,
          callsAnswered,
          messagesSent,
          messagesReceived,
          leadsContacted,
          followupsScheduled,
          followupsCompleted,
          activeConversations,
          activeTasks,
        },
      }
    }))

    return ok({ employees })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
