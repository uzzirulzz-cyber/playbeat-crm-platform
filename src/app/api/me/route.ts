import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorizedResponse } from '@/lib/http'
import { ensureDbInitialized } from '@/lib/db-init'

export async function GET(req: NextRequest) {
  await ensureDbInitialized()
  const user = await getCurrentUser(req)
  if (!user) return unauthorizedResponse()
  return ok({ user })
}
