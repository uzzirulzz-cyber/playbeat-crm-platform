import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Prisma client factory.
 *
 * - On Cloudflare Workers (OpenNext): binds to the D1 database via the
 *   @prisma/adapter-d1 driver adapter (env.DB) using the WASM client engine.
 * - Local dev / Node: falls back to a classic PrismaClient with DATABASE_URL.
 *
 * `db` is a lazy Proxy so the adapter is resolved on first use inside a real
 * request context (getCloudflareContext is unavailable during build/warmup).
 */

const globalForPrisma = globalThis as unknown as {
  __pbCrmPrisma?: PrismaClient
}

function buildClient(): PrismaClient {
  try {
    const cf = getCloudflareContext() as unknown as { env?: { DB?: D1Database } }
    const binding = cf?.env?.DB
    if (binding) {
      return new PrismaClient({
        adapter: new PrismaD1(binding),
        log: [],
      })
    }
  } catch {
    /* not running inside a Cloudflare request context — fall back below */
  }
  return new PrismaClient({
    log: ['query'],
  })
}

function getDb(): PrismaClient {
  if (!globalForPrisma.__pbCrmPrisma) {
    globalForPrisma.__pbCrmPrisma = buildClient()
  }
  return globalForPrisma.__pbCrmPrisma
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const real = getDb()
    const value = Reflect.get(real as object, prop, real)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
