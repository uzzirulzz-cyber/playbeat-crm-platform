// Health endpoint: returns DB and integration status.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getIntegrationStatus } from '@/lib/providers'
import { ok } from '@/lib/http'

export async function GET() {
  const checks: Record<string, any> = {
    server: 'ok',
    time: new Date().toISOString(),
  }
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (e: any) {
    checks.database = 'error'
    checks.databaseError = e?.message
  }
  try {
    checks.whatsapp = await getIntegrationStatus('WHATSAPP')
  } catch (e: any) {
    checks.whatsapp = 'error'
  }
  try {
    checks.email = await getIntegrationStatus('EMAIL')
  } catch (e: any) {
    checks.email = 'error'
  }
  return ok(checks)
}
