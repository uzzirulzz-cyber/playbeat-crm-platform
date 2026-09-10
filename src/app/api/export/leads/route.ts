// CSV export of leads (server-side). Optional filters in query params.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { unauthorizedResponse, serverError, parseJSON } from '@/lib/http'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  try {
    const url = new URL(req.url)
    const where: any = {}
    if (url.searchParams.get('city')) where.city = url.searchParams.get('city')!
    if (url.searchParams.get('category')) where.category = url.searchParams.get('category')!
    if (url.searchParams.get('status')) where.status = url.searchParams.get('status')!

    const leads = await db.lead.findMany({ where, take: 10000 })

    const headers = ['businessName','contactPerson','email','whatsapp','country','state','city','category','website','source','score','emailOptIn','whatsappOptIn','status','notes']
    const rows = leads.map((l) => {
      const tags = parseJSON<string[]>(l.tags, [])
      return [
        esc(l.businessName),
        esc(l.contactPerson || ''),
        esc(l.email || ''),
        esc(l.whatsapp || ''),
        esc(l.country || ''),
        esc(l.state || ''),
        esc(l.city || ''),
        esc(l.category || ''),
        esc(l.website || ''),
        esc(l.source || ''),
        l.score,
        l.emailOptIn ? 'true' : 'false',
        l.whatsappOptIn ? 'true' : 'false',
        esc(l.status),
        esc((l.notes || '').replace(/\n/g,' ')),
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
      },
    })
  } catch (e: any) {
    return serverError(e?.message || 'Export failed')
  }
}

function esc(v: string | number): string {
  const s = String(v ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
