// XLSX export of leads via xlsx library
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { unauthorizedResponse, serverError, parseJSON } from '@/lib/http'
import * as XLSX from 'xlsx'

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
    const data = leads.map((l) => ({
      BusinessName: l.businessName,
      Contact: l.contactPerson || '',
      Email: l.email || '',
      WhatsApp: l.whatsapp || '',
      Country: l.country || '',
      State: l.state || '',
      City: l.city || '',
      Category: l.category || '',
      Website: l.website || '',
      Source: l.source || '',
      Score: l.score,
      EmailOptIn: l.emailOptIn,
      WhatsAppOptIn: l.whatsappOptIn,
      Status: l.status,
      Tags: parseJSON<string[]>(l.tags, []).join('; '),
      Notes: l.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leads-${Date.now()}.xlsx"`,
      },
    })
  } catch (e: any) {
    return serverError(e?.message || 'Export failed')
  }
}
