// Seed script: creates a default admin user and example leads/segments/templates
// so the console is usable on first launch. Run with: bun run scripts/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const adminEmail = 'admin@leadpulse.local'
  let admin = await db.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    admin = await db.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'SUPER_ADMIN',
        active: true,
      },
    })
    console.log('Created admin:', adminEmail, '/ admin123')
  }

  const sampleLeads = [
    { businessName: 'Pearl Continental Hotel', contactPerson: 'Ayesha Khan', email: 'reservations@pearlcontinental.pk', whatsapp: '+923001234567', country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Abbottabad', category: 'Hotel', website: 'pearlcontinental.pk', source: 'Manual', score: 85, emailOptIn: true, whatsappOptIn: true, tags: ['hospitality','enterprise'] },
    { businessName: 'Sarhad Food Corner', contactPerson: 'Imran Ali', email: 'info@sarhadfood.pk', whatsapp: '+923331234567', country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Abbottabad', category: 'Restaurant', website: 'sarhadfood.pk', source: 'OpenStreetMap', score: 72, emailOptIn: true, whatsappOptIn: true, tags: ['food','smb'] },
    { businessName: 'Margala Tech Solutions', contactPerson: 'Bilal Sheikh', email: 'hello@margalatech.io', whatsapp: '+923001111111', country: 'Pakistan', state: 'Punjab', city: 'Lahore', category: 'Technology', website: 'margalatech.io', source: 'Web crawl', score: 91, emailOptIn: true, whatsappOptIn: true, tags: ['b2b','saas'] },
    { businessName: 'Q1 Café Islamabad', contactPerson: 'Hina Tariq', email: 'contact@q1cafe.pk', whatsapp: null, country: 'Pakistan', state: 'Islamabad', city: 'Islamabad', category: 'Cafe', website: 'q1cafe.pk', source: 'OpenStreetMap', score: 64, emailOptIn: true, whatsappOptIn: false, tags: ['food','smb'] },
    { businessName: 'NorthTravels Tour Operator', contactPerson: 'Saad Jadoon', email: 'team@northtravels.pk', whatsapp: '+923459876543', country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Mansehra', category: 'Travel', website: 'northtravels.pk', source: 'Referral', score: 78, emailOptIn: true, whatsappOptIn: true, tags: ['tourism','enterprise'] },
    { businessName: 'Beacon Public School Abbottabad', contactPerson: 'Nasreen Akhtar', email: 'office@beaconabbottabad.edu.pk', whatsapp: '+923005558899', country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Abbottabad', category: 'Education', website: 'beaconabbottabad.edu.pk', source: 'Import', score: 70, emailOptIn: true, whatsappOptIn: true, tags: ['education','smb'] },
    { businessName: 'Baltistan Auto Workshop', contactPerson: 'Gul Khan', email: null, whatsapp: '+923112223344', country: 'Pakistan', state: 'Gilgit-Baltistan', city: 'Skardu', category: 'Automotive', website: null, source: 'OpenStreetMap', score: 55, emailOptIn: false, whatsappOptIn: true, tags: ['automotive','smb'] },
    { businessName: 'Cedar Software House', contactPerson: 'Aisha Noor', email: 'careers@cedarsoft.dev', whatsapp: '+9334445566', country: 'Pakistan', state: 'Sindh', city: 'Karachi', category: 'Technology', website: 'cedarsoft.dev', source: 'Referral', score: 88, emailOptIn: true, whatsappOptIn: true, tags: ['b2b','saas','startup'] },
    { businessName: 'Hunza Valley Handicrafts', contactPerson: 'Saba Karim', email: 'sales@hunzahandicrafts.pk', whatsapp: '+934477788990', country: 'Pakistan', state: 'Gilgit-Baltistan', city: 'Hunza', category: 'Retail', website: 'hunzahandicrafts.pk', source: 'Web crawl', score: 67, emailOptIn: true, whatsappOptIn: true, tags: ['retail','handicraft'] },
    { businessName: 'Swat Health Clinic', contactPerson: 'Dr. Rehman Khan', email: 'appointments@swatclinic.pk', whatsapp: '+935566677788', country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Saidu Sharif', category: 'Healthcare', website: 'swatclinic.pk', source: 'Import', score: 81, emailOptIn: true, whatsappOptIn: true, tags: ['healthcare'] },
    { businessName: 'Peshawar Cloth House', contactPerson: 'Tariq Mehmood', email: 'sales@pshcloth.pk', whatsapp: null, country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Peshawar', category: 'Retail', website: 'pshcloth.pk', source: 'Manual', score: 60, emailOptIn: true, whatsappOptIn: false, tags: ['retail','smb'] },
    { businessName: 'Abbottabad Builders Co.', contactPerson: 'Asif Nawaz', email: 'build@atdbuilders.pk', whatsapp: '+930000001112', country: 'Pakistan', state: 'Khyber Pakhtunkhwa', city: 'Abbottabad', category: 'Construction', website: 'atdbuilders.pk', source: 'Referral', score: 75, emailOptIn: true, whatsappOptIn: true, tags: ['construction','enterprise'] },
  ]

  for (const l of sampleLeads) {
    const existing = await db.lead.findFirst({
      where: {
        OR: [
          { email: l.email ?? undefined },
          { businessName: l.businessName, city: l.city },
        ].filter(Boolean) as any,
      },
    })
    if (existing) continue
    await db.lead.create({
      data: {
        businessName: l.businessName,
        contactPerson: l.contactPerson,
        email: l.email ?? null,
        whatsapp: l.whatsapp ?? null,
        country: l.country,
        state: l.state,
        city: l.city,
        category: l.category,
        website: l.website ?? null,
        source: l.source,
        score: l.score,
        emailOptIn: l.emailOptIn,
        whatsappOptIn: l.whatsappOptIn,
        tags: JSON.stringify(l.tags),
        status: 'NEW',
      },
    })
  }

  const segCount = await db.segment.count()
  if (segCount === 0) {
    await db.segment.createMany({
      data: [
        { name: 'Abbottabad Hotels', description: 'All hotel businesses in Abbottabad', filters: JSON.stringify({ city: 'Abbottabad', category: 'Hotel' }) },
        { name: 'High-Score B2B', description: 'Score >= 80 with b2b tag', filters: JSON.stringify({ scoreMin: 80, tags: ['b2b'] }) },
        { name: 'WhatsApp-enabled SMB', description: 'Leads with WhatsApp opt-in', filters: JSON.stringify({ whatsappOptIn: true }) },
      ],
    })
  }

  const tplCount = await db.template.count()
  if (tplCount === 0) {
    await db.template.createMany({
      data: [
        {
          name: 'welcome_intro',
          channel: 'EMAIL',
          category: 'MARKETING',
          subject: 'Helping {{business_name}} grow',
          body: "Hi {{contact_name}},\n\nWe noticed that {{business_name}} operates in {{city}}, and we'd love to help you grow. Reply to schedule a quick call.\n\n— LeadPulse Team",
          variables: JSON.stringify(['business_name','contact_name','city']),
          approved: true,
        },
        {
          name: 'whatsapp_promo_intro',
          channel: 'WHATSAPP',
          language: 'en',
          category: 'MARKETING',
          body: 'Hi {{contact_name}}, this is LeadPulse. We have an offer for {{business_name}} in {{city}}. Reply STOP to opt out.',
          variables: JSON.stringify(['contact_name','business_name','city']),
          approved: true,
        },
        {
          name: 'appointment_followup',
          channel: 'EMAIL',
          category: 'UTILITY',
          subject: 'Following up — {{business_name}}',
          body: 'Hi {{contact_name}}, following up on our last conversation about {{business_name}}. Looking forward to your reply.',
          variables: JSON.stringify(['business_name','contact_name']),
          approved: false,
        },
      ],
    })
  }

  const settingsCount = await db.setting.count()
  if (settingsCount === 0) {
    await db.setting.createMany({
      data: [
        { key: 'system.timezone', value: 'Asia/Karachi', category: 'SYSTEM' },
        { key: 'system.campaignLimit', value: '1000', category: 'SYSTEM' },
        { key: 'notification.emailOnError', value: 'true', category: 'NOTIFICATION' },
        { key: 'meta_capi.autoFireOnConverted', value: 'true', category: 'META_CAPI' },
      ],
    })
  }

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error('seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
