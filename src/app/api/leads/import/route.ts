// CSV / XLSX import + bulk paste + import preview.
// Body: { source: 'csv'|'xlsx'|'json', data: string, mode: 'preview'|'commit' }
// For xlsx, data is base64-encoded file content.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, writeAuditLog, hasRole, ROLES } from '@/lib/auth'
import { ok, badRequest, unauthorizedResponse, forbiddenResponse, serverError, normalizeEmail, normalizePhone, isValidEmail, isValidPhone } from '@/lib/http'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface RowData {
  businessName?: string
  contactPerson?: string
  email?: string
  whatsapp?: string
  country?: string
  state?: string
  city?: string
  category?: string
  website?: string
  source?: string
  score?: number
  emailOptIn?: boolean
  whatsappOptIn?: boolean
}

function parseRow(row: any): RowData {
  const get = (k: string, alts: string[] = []) => {
    for (const key of [k, ...alts]) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return String(row[key]).trim()
    }
    return ''
  }
  return {
    businessName: get('businessName', ['Business Name','business_name','name','Company']),
    contactPerson: get('contactPerson', ['Contact Person','contact_person','Person','Contact']),
    email: get('email', ['Email','E-mail']),
    whatsapp: get('whatsapp', ['WhatsApp','Phone','phone','whatsapp_number','Mobile']),
    country: get('country', ['Country']),
    state: get('state', ['State','Province']),
    city: get('city', ['City']),
    category: get('category', ['Category','Business Category']),
    website: get('website', ['Website','URL']),
    source: get('source', ['Source']) || 'Import',
    score: Number(get('score', ['Score']) || 0),
    emailOptIn: get('emailOptIn', ['Email Opt In','email_optin']).toLowerCase() === 'true',
    whatsappOptIn: get('whatsappOptIn', ['WhatsApp Opt In','whatsapp_optin']).toLowerCase() === 'true',
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  if (!hasRole(user, ROLES.CAMPAIGN_MANAGER)) return forbiddenResponse()

  try {
    const body = await req.json()
    const source = String(body.source || 'csv').toLowerCase()
    const mode = String(body.mode || 'preview').toLowerCase() as 'preview' | 'commit'
    const data = String(body.data || '')
    if (!data) return badRequest('Data is required')

    let rows: any[] = []
    if (source === 'csv') {
      const parsed = Papa.parse(data, { header: true, skipEmptyLines: true })
      rows = parsed.data as any[]
    } else if (source === 'xlsx') {
      const buf = Buffer.from(data, 'base64')
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(sheet)
    } else if (source === 'json') {
      rows = JSON.parse(data)
    } else {
      return badRequest('Unknown source type')
    }

    const preview = rows.map((r) => parseRow(r))

    const analysis = {
      totalRows: preview.length,
      validEmails: preview.filter((p) => !p.email || isValidEmail(normalizeEmail(p.email))).length,
      invalidEmails: preview.filter((p) => p.email && !isValidEmail(normalizeEmail(p.email))).length,
      validWhatsApps: preview.filter((p) => !p.whatsapp || isValidPhone(normalizePhone(p.whatsapp))).length,
      invalidWhatsApps: preview.filter((p) => p.whatsapp && !isValidPhone(normalizePhone(p.whatsapp))).length,
      missingData: preview.filter((p) => !p.businessName).length,
      duplicates: 0,
      duplicateRows: [] as number[],
      skipRows: [] as number[],
    }

    const allEmails = preview.filter((p) => p.email).map((p) => normalizeEmail(p.email!))
    const allPhones = preview.filter((p) => p.whatsapp).map((p) => normalizePhone(p.whatsapp!))
    const existingEmails = allEmails.length ? await db.lead.findMany({ where: { email: { in: allEmails } }, select: { email: true } }) : []
    const existingPhones = allPhones.length ? await db.lead.findMany({ where: { whatsapp: { in: allPhones } }, select: { whatsapp: true } }) : []
    const emailSet = new Set(existingEmails.map((e) => e.email?.toLowerCase()))
    const phoneSet = new Set(existingPhones.map((p) => p.whatsapp))

    preview.forEach((p, i) => {
      if (!p.businessName) {
        analysis.skipRows.push(i)
        return
      }
      const emailDup = p.email && emailSet.has(normalizeEmail(p.email))
      const phoneDup = p.whatsapp && phoneSet.has(normalizePhone(p.whatsapp))
      if (emailDup || phoneDup) {
        analysis.duplicates++
        analysis.duplicateRows.push(i)
      }
    })

    if (mode === 'preview') {
      return ok({ preview, analysis })
    }

    const created: any[] = []
    for (let i = 0; i < preview.length; i++) {
      const p = preview[i]
      if (!p.businessName || analysis.skipRows.includes(i) || analysis.duplicateRows.includes(i)) continue
      const lead = await db.lead.create({
        data: {
          businessName: p.businessName,
          contactPerson: p.contactPerson || null,
          email: p.email ? normalizeEmail(p.email) : null,
          whatsapp: p.whatsapp ? normalizePhone(p.whatsapp) : null,
          country: p.country || null,
          state: p.state || null,
          city: p.city || null,
          category: p.category || null,
          website: p.website || null,
          source: p.source || 'Import',
          score: Number(p.score || 0),
          emailOptIn: p.emailOptIn ?? false,
          whatsappOptIn: p.whatsappOptIn ?? false,
          whatsappAvailable: !!p.whatsapp,
          tags: JSON.stringify([]),
          status: 'NEW',
        },
      })
      created.push(lead.id)
    }

    await writeAuditLog({ user, action: 'LEAD_IMPORT', entity: 'Lead', details: `Imported ${created.length} of ${preview.length}`, req })
    return ok({ created: created.length, total: preview.length })
  } catch (e: any) {
    return serverError(e?.message || 'Import failed')
  }
}
