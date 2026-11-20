// Database setup endpoint — initializes tables and seeds the admin user.
// Idempotent: safe to call on every deploy. On Cloudflare Workers the D1
// database ships pre-migrated; ensureDbInitialized seeds the admin if needed.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ensureDbInitialized } from '@/lib/db-init'
import { ok, serverError } from '@/lib/http'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized()
    const checks = await db.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    )
    return ok({
      success: true,
      tables: checks.map((t) => t.name),
      admin: 'admin@playbeat.digital',
    })
  } catch (e: unknown) {
    return serverError(e instanceof Error ? e.message : 'Setup failed')
  }
}

export async function GET() {
  return POST(new NextRequest('http://local/setup'))
}
