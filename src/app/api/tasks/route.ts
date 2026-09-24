// Tasks API: GET (by leadId or employeeId) + POST
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, serverError } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const leadId = url.searchParams.get('leadId')
    const employeeId = url.searchParams.get('employeeId')
    const status = url.searchParams.get('status')
    const where: any = {}
    if (leadId) where.leadId = leadId
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status
    const tasks = await db.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: 200,
    })
    return ok({ tasks })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    if (!title) return badRequest('title required')
    const task = await db.task.create({
      data: {
        leadId: body.leadId || null,
        employeeId: user.id,
        employeeName: user.name,
        title,
        description: body.description || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority || 'NORMAL',
        status: 'OPEN',
      },
    })
    await writeAuditLog({ user, action: 'TASK_CREATED', entity: 'Task', entityId: task.id, details: title, req })
    return ok({ task })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
