// Provider service: WhatsApp Cloud API + Email (SMTP/IMAP) integrations.
// All credentials are read from environment variables OR from the Integration table.
// When not configured, status is reported as DISCONNECTED and send attempts throw a
// clear "NOT CONNECTED" error rather than silently no-op'ing.

import nodemailer from 'nodemailer'
import { db } from '@/lib/db'
import { parseJSON } from '@/lib/http'

export interface WhatsAppConfig {
  accessToken: string
  phoneNumberId: string
  businessAccountId?: string
  verifyToken?: string
  wabaId?: string
  apiVersion?: string
}

export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
  imapHost?: string
  imapPort?: number
  imapUser?: string
  imapPassword?: string
}

const envWhatsApp: WhatsAppConfig | null = (() => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) return null
  return {
    accessToken: token,
    phoneNumberId: phoneId,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  }
})()

const envEmail: EmailConfig | null = (() => {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM
  if (!host || !user || !pass || !from) return null
  return {
    smtpHost: host,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: user,
    smtpPassword: pass,
    smtpFrom: from,
    imapHost: process.env.IMAP_HOST,
    imapPort: Number(process.env.IMAP_PORT || 993),
    imapUser: process.env.IMAP_USER,
    imapPassword: process.env.IMAP_PASSWORD,
  }
})()

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  if (envWhatsApp) return envWhatsApp
  const integration = await db.integration.findUnique({ where: { provider: 'WHATSAPP' } })
  if (!integration) return null
  const config = parseJSON<WhatsAppConfig>(integration.config, {} as WhatsAppConfig)
  if (!config.accessToken || !config.phoneNumberId) return null
  return { ...envWhatsApp, ...config }
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  if (envEmail) return envEmail
  const integration = await db.integration.findUnique({ where: { provider: 'EMAIL' } })
  if (!integration) return null
  const config = parseJSON<EmailConfig>(integration.config, {} as EmailConfig)
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) return null
  return { ...envEmail, ...config }
}

export async function getIntegrationStatus(provider: 'WHATSAPP' | 'EMAIL'): Promise<'CONNECTED' | 'DISCONNECTED'> {
  if (provider === 'WHATSAPP') return (await getWhatsAppConfig()) ? 'CONNECTED' : 'DISCONNECTED'
  return (await getEmailConfig()) ? 'CONNECTED' : 'DISCONNECTED'
}

export async function sendWhatsAppMessage(params: {
  to: string
  templateName?: string
  body: string
  language?: string
  components?: any[]
}): Promise<{ providerId: string; status: string }> {
  const config = await getWhatsAppConfig()
  if (!config) throw new Error('WhatsApp NOT CONNECTED. Configure Business Account ID, Phone Number ID, and Access Token in Settings or environment variables.')

  const url = `https://graph.facebook.com/${config.apiVersion || 'v21.0'}/${config.phoneNumberId}/messages`
  const payload = params.templateName
    ? {
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.language || 'en' },
          components: params.components,
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'text',
        text: { body: params.body },
      }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WhatsApp API error (${res.status}): ${text}`)
  }

  const json: any = await res.json()
  const providerId = json?.messages?.[0]?.id || json?.message_id || 'unknown'
  return { providerId, status: 'SENT' }
}

export async function verifyWhatsAppWebhookToken(token: string): Promise<boolean> {
  const config = await getWhatsAppConfig()
  if (!config?.verifyToken) return false
  return token === config.verifyToken
}

export async function sendEmailMessage(params: {
  to: string
  subject: string
  html?: string
  text?: string
  fromName?: string
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}): Promise<{ providerId: string; status: string }> {
  const config = await getEmailConfig()
  if (!config) throw new Error('Email NOT CONNECTED. Configure SMTP host, port, user, password, and from address in Settings or environment variables.')

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
  })

  const info = await transporter.sendMail({
    from: params.fromName ? `${params.fromName} <${config.smtpFrom}>` : config.smtpFrom,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments,
  })

  return { providerId: info.messageId, status: 'SENT' }
}

export function maskSecret(s: string | undefined): string {
  if (!s) return ''
  if (s.length <= 4) return '*'.repeat(s.length)
  return s.slice(0, 2) + '*'.repeat(Math.max(4, s.length - 6)) + s.slice(-2)
}
