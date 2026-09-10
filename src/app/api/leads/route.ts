import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, parseJSON, normalizeEmail, normalizePhone, isValidEmail, isValidPhone, domainFromWebsite } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50'), 200)
  const search = url.searchParams.get('search') || undefined
  const city = url.searchParams.get('city') || undefined
  const category = url.searchParams.get('category') || undefined
  const status = url.searchParams.get('status') || undefined
  const country = url.searchParams.get('country') || undefined

  const where: any = {}
  if (city) where.city = city
  if (category) where.category = category
  if (status) where.status = status
  if (country) where.country = country
  if (search) {
    where.OR = [
      { businessName: { contains: search } },
      { contactPerson: { contains: search } },
      { email: { contains: search } },
      { whatsapp: { contains: search } },
    ]
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    db.lead.count({ where }),
  ])

  return ok({
    leads: leads.map((l) => ({ ...l, tags: parseJSON<string[]>(l.tags, []) })),
    total,
    page,
    pageSize,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.AGENT)) return forbiddenResponse()

  try {
    const body = await req.json()
    const businessName = String(body.businessName || '').trim()
    if (!businessName) return badRequest('businessName required')

    const email = body.email ? normalizeEmail(String(body.email)) : null
    const whatsapp = body.whatsapp ? normalizePhone(String(body.whatsapp)) : null

    if (email && !isValidEmail(email)) return badRequest('Invalid email')
    if (whatsapp && !isValidPhone(whatsapp)) return badRequest('Invalid WhatsApp number')

    // Duplicate detection
    const dup = await db.lead.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(whatsapp ? [{ whatsapp }] : []),
          { businessName, city: body.city || null },
        ].filter(Boolean) as any,
      },
    })
    if (dup) return badRequest(`Duplicate lead: matches existing record "${dup.businessName}"`)

    const lead = await db.lead.create({
      data: {
        businessName,
        contactPerson: body.contactPerson || null,
        email,
        whatsapp,
        country: body.country || null,
        state: body.state || null,
        city: body.city || null,
        category: body.category || null,
        website: body.website || null,
        source: body.source || 'Manual',
        tags: JSON.stringify(body.tags || []),
        score: Number(body.score || 0),
        emailVerified: !!body.emailVerified,
        whatsappAvailable: !!whatsapp,
        emailOptIn: body.emailOptIn ?? false,
        whatsappOptIn: body.whatsappOptIn ?? false,
        doNotContact: body.doNotContact ?? false,
        notes: body.notes || null,
        status: body.status || 'NEW',
      },
    })

    await writeAuditLog({ user, action: 'LEAD_CREATE', entity: 'Lead', entityId: lead.id, details: businessName, req })
    return ok({ lead: { ...lead, tags: parseJSON<string[]>(lead.tags, []) } })
  } catch (e: any) {
    return serverError(e?.message || 'Create failed')
  }
}
