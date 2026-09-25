// Auto-initialization helper for serverless environments.
// On first request to a fresh /tmp database, creates tables and seeds admin.
// Uses a global flag to avoid re-checking on every request in the same
// function instance.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

let initialized = false
let initializing: Promise<void> | null = null

const TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "password" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'VIEWER', "active" BOOLEAN NOT NULL DEFAULT true, "employeeCode" TEXT, "availability" TEXT NOT NULL DEFAULT 'OFFLINE', "title" TEXT, "avatar" TEXT, "phone" TEXT, "lastLogin" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "User_email_key" UNIQUE ("email"))`,
  `CREATE TABLE IF NOT EXISTS "Lead" ("id" TEXT NOT NULL PRIMARY KEY, "businessName" TEXT NOT NULL, "contactPerson" TEXT, "email" TEXT, "whatsapp" TEXT, "phone" TEXT, "country" TEXT, "state" TEXT, "city" TEXT, "category" TEXT, "industry" TEXT, "website" TEXT, "source" TEXT, "tags" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'NEW', "score" INTEGER NOT NULL DEFAULT 0, "emailVerified" BOOLEAN NOT NULL DEFAULT false, "whatsappAvailable" BOOLEAN NOT NULL DEFAULT false, "emailOptIn" BOOLEAN NOT NULL DEFAULT false, "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false, "doNotContact" BOOLEAN NOT NULL DEFAULT false, "assignedTo" TEXT, "assignedToName" TEXT, "assignedAt" DATETIME, "lastContacted" DATETIME, "lastReplied" DATETIME, "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Integration" ("id" TEXT NOT NULL PRIMARY KEY, "provider" TEXT NOT NULL, "config" TEXT NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'DISCONNECTED', "lastSync" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Integration_provider_key" UNIQUE ("provider"))`,
  `CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "value" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'SYSTEM', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Setting_key_key" UNIQUE ("key"))`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT, "userName" TEXT, "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "entityId" TEXT, "details" TEXT, "ip" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Call" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT, "leadName" TEXT, "leadPhone" TEXT, "conversationId" TEXT, "employeeId" TEXT, "employeeName" TEXT, "direction" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'INITIATING', "phone" TEXT NOT NULL, "channel" TEXT NOT NULL DEFAULT 'TELEPHONY', "durationSec" INTEGER NOT NULL DEFAULT 0, "outcome" TEXT, "outcomeNotes" TEXT, "nextFollowupAt" DATETIME, "recordingUrl" TEXT, "provider" TEXT, "providerCallId" TEXT, "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "connectedAt" DATETIME, "endedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Conversation" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "leadName" TEXT, "leadPhone" TEXT, "leadEmail" TEXT, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "assignedTo" TEXT, "unreadCount" INTEGER NOT NULL DEFAULT 0, "lastMessage" TEXT, "lastMessageAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT, "conversationId" TEXT, "channel" TEXT NOT NULL, "direction" TEXT NOT NULL, "campaignId" TEXT, "messageId" TEXT, "subject" TEXT, "body" TEXT NOT NULL, "providerId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "error" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Product" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "longDescription" TEXT, "categoryId" TEXT, "categoryName" TEXT, "price" REAL NOT NULL, "salePrice" REAL, "cost" REAL, "currency" TEXT NOT NULL DEFAULT 'PKR', "type" TEXT NOT NULL DEFAULT 'DIGITAL', "deliveryType" TEXT NOT NULL DEFAULT 'INSTANT', "stock" INTEGER NOT NULL DEFAULT 0, "unlimited" BOOLEAN NOT NULL DEFAULT false, "images" TEXT NOT NULL DEFAULT '[]', "variants" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "featured" BOOLEAN NOT NULL DEFAULT false, "visibility" TEXT NOT NULL DEFAULT 'PUBLIC', "licenseSource" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Product_slug_key" UNIQUE ("slug"))`,
  `CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "icon" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Category_name_key" UNIQUE ("name"), CONSTRAINT "Category_slug_key" UNIQUE ("slug"))`,
  `CREATE TABLE IF NOT EXISTS "Order" ("id" TEXT NOT NULL PRIMARY KEY, "orderNumber" TEXT NOT NULL, "customerId" TEXT, "customerName" TEXT, "customerEmail" TEXT, "customerPhone" TEXT, "customerWhatsapp" TEXT, "items" TEXT NOT NULL DEFAULT '[]', "subtotal" REAL NOT NULL DEFAULT 0, "discount" REAL NOT NULL DEFAULT 0, "tax" REAL NOT NULL DEFAULT 0, "shipping" REAL NOT NULL DEFAULT 0, "total" REAL NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'PKR', "paymentMethod" TEXT, "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING', "fulfillmentStatus" TEXT NOT NULL DEFAULT 'NEW', "notes" TEXT, "ipAddress" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Order_orderNumber_key" UNIQUE ("orderNumber"))`,
  `CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")`,
  `CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email")`,
  `CREATE INDEX IF NOT EXISTS "Lead_whatsapp_idx" ON "Lead"("whatsapp")`,
  `CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status")`,
  `CREATE INDEX IF NOT EXISTS "Product_slug_idx" ON "Product"("slug")`,
]

let dbInstance: PrismaClient | null = null

function getDb(): PrismaClient {
  if (!dbInstance) {
    dbInstance = new PrismaClient()
  }
  return dbInstance
}

/** Auto-initialize the database on first request. Safe to call multiple times. */
export async function ensureDbInitialized(): Promise<void> {
  if (initialized) return
  if (initializing) return initializing

  initializing = (async () => {
    const db = getDb()
    try {
      // Check if User table exists
      const tableCheck = await db.$queryRawUnsafe<any>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='User'`
      )
      const userTableExists = Array.isArray(tableCheck) && tableCheck.length > 0

      if (!userTableExists) {
        // Run all CREATE TABLE statements
        for (const sql of TABLE_SQL) {
          try { await db.$executeRawUnsafe(sql) } catch {}
        }
        // Seed admin user
        const adminEmail = 'admin@playbeat.digital'
        const existing = await db.user.findUnique({ where: { email: adminEmail } }).catch(() => null)
        if (!existing) {
          await db.user.create({
            data: {
              email: adminEmail,
              name: 'Playbeat Admin',
              password: await bcrypt.hash('playbeat1122', 10),
              role: 'SUPER_ADMIN',
              active: true,
              title: 'CRM Manager',
              availability: 'ONLINE',
            },
          }).catch(() => {})
        }
      }
      initialized = true
    } catch (e) {
      // Don't throw — let the actual request try and fail with a proper error
      console.error('DB init failed:', e)
    } finally {
      initializing = null
    }
  })()

  return initializing
}
