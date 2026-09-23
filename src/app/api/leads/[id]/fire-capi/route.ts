// Convenience: fire CAPI Lead event for a single lead by id (path-param version)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'
import { ok, notFound, unauthorizedResponse, serverError, badRequest } from '@/lib/http'
import { fireLeadEventForLead, getMetaCAPIStatus } from '@/lib/meta-capi'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const params: any = (ctx as any).params
    const id = typeof params?.then === 'function' ? (await params).id : params.id
    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead not found')

    const status = await getMetaCAPIStatus()
    if (status === 'DISCONNECTED') {
      return badRequest('Meta CAPI NOT CONNECTED. Configure Access Token and Pixel ID in Integrations first.')
    }

    const result = await fireLeadEventForLead(lead, 'Lead')
    if (!result.ok) {
      return serverError(`Meta CAPI send failed: ${result.error}`)
    }

    await writeAuditLog({
      user,
      action: 'META_CAPI_FIRE',
      entity: 'Lead',
      entityId: lead.id,
      details: `Lead event → Meta pixel (providerId: ${result.providerId})`,
      req,
    })

    return ok({
      ok: true,
      leadId: lead.id,
      providerId: result.providerId,
      payload: result.payload,
    })
  } catch (e: any) {
    return serverError(e?.message || 'Failed')
  }
}
