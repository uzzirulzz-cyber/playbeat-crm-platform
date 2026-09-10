import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, normalizeEmail, normalizePhone, isValidEmail, isValidPhone } from '@/lib/http'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()

  try {
    const body = await req.json()
    const lines: string[] = Array.isArray(body.lines) ? body.lines : String(body.data || '').split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) return badRequest('No rows provided')

    let created = 0
    let skipped = 0
    for (const line of lines) {
      const parts = line.split(/[,\t;|]/).map((s) => s.trim()).filter(Boolean)
      if (parts.length < 1) { skipped++; continue }
      const [businessName, contactPerson, email, whatsapp, city, country, category] = parts
      const normEmail = email ? normalizeEmail(email) : null
      const normPhone = whatsapp ? normalizePhone(whatsapp) : null
      if (normEmail && !isValidEmail(normEmail)) { skipped++; continue }
      if (normPhone && !isValidPhone(normPhone)) { skipped++; continue }
      const dup = await db.lead.findFirst({
        where: {
          OR: [
            ...(normEmail ? [{ email: normEmail }] : []),
            ...(normPhone ? [{ whatsapp: normPhone }] : []),
            { businessName, city: city || null },
          ].filter(Boolean) as any,
        },
      })
      if (dup) { skipped++; continue }
      await db.lead.create({
        data: {
          businessName,
          contactPerson: contactPerson || null,
          email: normEmail,
          whatsapp: normPhone,
          city: city || null,
          country: country || null,
          category: category || null,
          source: 'Bulk paste',
          tags: '[]',
          status: 'NEW',
        },
      })
      created++
    }
    await writeAuditLog({ user, action: 'LEAD_BULK', entity: 'Lead', details: `Created ${created}, skipped ${skipped}`, req })
    return ok({ created, skipped, total: lines.length })
  } catch (e: any) {
    return serverError(e?.message || 'Bulk import failed')
  }
}
