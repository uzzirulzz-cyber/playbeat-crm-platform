// Auto-initialization helper for serverless environments.
// On first request to a fresh /tmp database, creates tables and seeds admin.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

let initialized = false
let initializing: Promise<void> | null = null

const TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "password" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'VIEWER', "active" BOOLEAN NOT NULL DEFAULT true, "employeeCode" TEXT, "availability" TEXT NOT NULL DEFAULT 'OFFLINE', "title" TEXT, "avatar" TEXT, "phone" TEXT, "lastLogin" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "User_email_key" UNIQUE ("email"))`,
  `CREATE TABLE IF NOT EXISTS "Lead" ("id" TEXT NOT NULL PRIMARY KEY, "businessName" TEXT NOT NULL, "contactPerson" TEXT, "email" TEXT, "whatsapp" TEXT, "phone" TEXT, "country" TEXT, "state" TEXT, "city" TEXT, "category" TEXT, "industry" TEXT, "website" TEXT, "source" TEXT, "tags" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'NEW', "score" INTEGER NOT NULL DEFAULT 0, "emailVerified" BOOLEAN NOT NULL DEFAULT false, "whatsappAvailable" BOOLEAN NOT NULL DEFAULT false, "emailOptIn" BOOLEAN NOT NULL DEFAULT false, "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false, "doNotContact" BOOLEAN NOT NULL DEFAULT false, "assignedTo" TEXT, "assignedToName" TEXT, "assignedAt" DATETIME, "lastContacted" DATETIME, "lastReplied" DATETIME, "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Segment" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "filters" TEXT NOT NULL DEFAULT '{}', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Campaign" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "channel" TEXT NOT NULL, "segmentId" TEXT, "segmentName" TEXT, "subject" TEXT, "message" TEXT NOT NULL, "templateId" TEXT, "attachments" TEXT NOT NULL DEFAULT '[]', "scheduledAt" DATETIME, "status" TEXT NOT NULL DEFAULT 'DRAFT', "createdBy" TEXT NOT NULL, "createdByName" TEXT, "startedAt" DATETIME, "completedAt" DATETIME, "stats" TEXT NOT NULL DEFAULT '{}', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "CampaignRecipient" ("id" TEXT NOT NULL PRIMARY KEY, "campaignId" TEXT NOT NULL, "leadId" TEXT NOT NULL, "leadName" TEXT, "leadEmail" TEXT, "leadPhone" TEXT, "status" TEXT NOT NULL DEFAULT 'QUEUED', "messageId" TEXT, "providerId" TEXT, "error" TEXT, "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "sentAt" DATETIME, "deliveredAt" DATETIME, "readAt" DATETIME, "failedAt" DATETIME)`,
  `CREATE TABLE IF NOT EXISTS "Template" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "channel" TEXT NOT NULL, "language" TEXT NOT NULL DEFAULT 'en', "category" TEXT NOT NULL DEFAULT 'MARKETING', "subject" TEXT, "body" TEXT NOT NULL, "variables" TEXT NOT NULL DEFAULT '[]', "approved" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Suppression" ("id" TEXT NOT NULL PRIMARY KEY, "type" TEXT NOT NULL, "value" TEXT NOT NULL, "reason" TEXT NOT NULL DEFAULT 'MANUAL', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Suppression_type_value_key" UNIQUE ("type", "value"))`,
  `CREATE TABLE IF NOT EXISTS "WebhookEvent" ("id" TEXT NOT NULL PRIMARY KEY, "provider" TEXT NOT NULL, "eventId" TEXT, "payload" TEXT NOT NULL, "processed" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Integration" ("id" TEXT NOT NULL PRIMARY KEY, "provider" TEXT NOT NULL, "config" TEXT NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'DISCONNECTED', "lastSync" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Integration_provider_key" UNIQUE ("provider"))`,
  `CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "value" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'SYSTEM', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Setting_key_key" UNIQUE ("key"))`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT, "userName" TEXT, "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "entityId" TEXT, "details" TEXT, "ip" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Call" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT, "leadName" TEXT, "leadPhone" TEXT, "conversationId" TEXT, "employeeId" TEXT, "employeeName" TEXT, "direction" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'INITIATING', "phone" TEXT NOT NULL, "channel" TEXT NOT NULL DEFAULT 'TELEPHONY', "durationSec" INTEGER NOT NULL DEFAULT 0, "outcome" TEXT, "outcomeNotes" TEXT, "nextFollowupAt" DATETIME, "recordingUrl" TEXT, "provider" TEXT, "providerCallId" TEXT, "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "connectedAt" DATETIME, "endedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Note" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "employeeId" TEXT, "employeeName" TEXT, "body" TEXT NOT NULL, "pinned" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Task" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT, "employeeId" TEXT, "employeeName" TEXT, "title" TEXT NOT NULL, "description" TEXT, "dueDate" DATETIME, "status" TEXT NOT NULL DEFAULT 'OPEN', "priority" TEXT NOT NULL DEFAULT 'NORMAL', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Followup" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "leadName" TEXT, "employeeId" TEXT, "employeeName" TEXT, "scheduledAt" DATETIME NOT NULL, "channel" TEXT NOT NULL DEFAULT 'WHATSAPP', "status" TEXT NOT NULL DEFAULT 'SCHEDULED', "notes" TEXT, "callId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT, "read" BOOLEAN NOT NULL DEFAULT false, "entityId" TEXT, "entityType" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Conversation" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "leadName" TEXT, "leadPhone" TEXT, "leadEmail" TEXT, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "assignedTo" TEXT, "unreadCount" INTEGER NOT NULL DEFAULT 0, "lastMessage" TEXT, "lastMessageAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Message" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT, "conversationId" TEXT, "channel" TEXT NOT NULL, "direction" TEXT NOT NULL, "campaignId" TEXT, "messageId" TEXT, "subject" TEXT, "body" TEXT NOT NULL, "providerId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "error" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Product" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "longDescription" TEXT, "categoryId" TEXT, "categoryName" TEXT, "price" REAL NOT NULL, "salePrice" REAL, "cost" REAL, "currency" TEXT NOT NULL DEFAULT 'PKR', "type" TEXT NOT NULL DEFAULT 'DIGITAL', "deliveryType" TEXT NOT NULL DEFAULT 'INSTANT', "stock" INTEGER NOT NULL DEFAULT 0, "unlimited" BOOLEAN NOT NULL DEFAULT false, "images" TEXT NOT NULL DEFAULT '[]', "variants" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'ACTIVE', "featured" BOOLEAN NOT NULL DEFAULT false, "visibility" TEXT NOT NULL DEFAULT 'PUBLIC', "licenseSource" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Product_slug_key" UNIQUE ("slug"))`,
  `CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "icon" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Category_name_key" UNIQUE ("name"), CONSTRAINT "Category_slug_key" UNIQUE ("slug"))`,
  `CREATE TABLE IF NOT EXISTS "Order" ("id" TEXT NOT NULL PRIMARY KEY, "orderNumber" TEXT NOT NULL, "customerId" TEXT, "customerName" TEXT, "customerEmail" TEXT, "customerPhone" TEXT, "customerWhatsapp" TEXT, "items" TEXT NOT NULL DEFAULT '[]', "subtotal" REAL NOT NULL DEFAULT 0, "discount" REAL NOT NULL DEFAULT 0, "tax" REAL NOT NULL DEFAULT 0, "shipping" REAL NOT NULL DEFAULT 0, "total" REAL NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'PKR', "paymentMethod" TEXT, "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING', "fulfillmentStatus" TEXT NOT NULL DEFAULT 'NEW', "notes" TEXT, "ipAddress" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Order_orderNumber_key" UNIQUE ("orderNumber"))`,
  `CREATE TABLE IF NOT EXISTS "Payment" ("id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "orderNumber" TEXT, "amount" REAL NOT NULL, "currency" TEXT NOT NULL DEFAULT 'PKR', "method" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "provider" TEXT, "providerPaymentId" TEXT, "transactionId" TEXT, "rawResponse" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "License" ("id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "productName" TEXT, "licenseKey" TEXT NOT NULL, "licenseData" TEXT, "supplier" TEXT, "status" TEXT NOT NULL DEFAULT 'AVAILABLE', "orderId" TEXT, "customerId" TEXT, "customerEmail" TEXT, "activationStatus" TEXT, "deliveryStatus" TEXT, "expiresAt" DATETIME, "deliveredAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Subscription" ("id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT, "customerEmail" TEXT, "productId" TEXT, "productName" TEXT, "plan" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" DATETIME, "autoRenew" BOOLEAN NOT NULL DEFAULT false, "orderId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Discount" ("id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "description" TEXT, "type" TEXT NOT NULL DEFAULT 'PERCENTAGE', "value" REAL NOT NULL, "minOrder" REAL, "maxDiscount" REAL, "usageLimit" INTEGER, "usageCount" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, "startsAt" DATETIME, "endsAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Discount_code_key" UNIQUE ("code"))`,
  `CREATE TABLE IF NOT EXISTS "PhoneNumber" ("id" TEXT NOT NULL PRIMARY KEY, "number" TEXT NOT NULL, "friendlyName" TEXT, "country" TEXT, "provider" TEXT NOT NULL DEFAULT 'mock', "capabilities" TEXT NOT NULL DEFAULT '[]', "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PhoneNumber_number_key" UNIQUE ("number"))`,
  `CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")`,
  `CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email")`,
  `CREATE INDEX IF NOT EXISTS "Lead_whatsapp_idx" ON "Lead"("whatsapp")`,
  `CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status")`,
  `CREATE INDEX IF NOT EXISTS "Lead_assignedTo_idx" ON "Lead"("assignedTo")`,
  `CREATE INDEX IF NOT EXISTS "Call_leadId_idx" ON "Call"("leadId")`,
  `CREATE INDEX IF NOT EXISTS "Call_status_idx" ON "Call"("status")`,
  `CREATE INDEX IF NOT EXISTS "Conversation_leadId_idx" ON "Conversation"("leadId")`,
  `CREATE INDEX IF NOT EXISTS "Message_leadId_idx" ON "Message"("leadId")`,
  `CREATE INDEX IF NOT EXISTS "Product_slug_idx" ON "Product"("slug")`,
  `CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status")`,
  `CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId")`,
  `CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status")`,
  `CREATE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId")`,
  `CREATE INDEX IF NOT EXISTS "Note_leadId_idx" ON "Note"("leadId")`,
  `CREATE INDEX IF NOT EXISTS "Task_leadId_idx" ON "Task"("leadId")`,
  `CREATE INDEX IF NOT EXISTS "Followup_leadId_idx" ON "Followup"("leadId")`,
  `CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId")`,
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
      const tableCheck = await db.$queryRawUnsafe<any>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='User'`
      )
      const userTableExists = Array.isArray(tableCheck) && tableCheck.length > 0

      if (!userTableExists) {
        for (const sql of TABLE_SQL) {
          try { await db.$executeRawUnsafe(sql) } catch {}
        }
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
      console.error('DB init failed:', e)
    } finally {
      initializing = null
    }
  })()

  return initializing
}
