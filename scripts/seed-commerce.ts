// Seed PlayBeat Digital marketplace: categories, products, and sample licenses
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // Categories
  const categories = [
    { name: 'Streaming', slug: 'streaming', icon: '🎬', sortOrder: 1, description: 'Netflix, Prime Video, Disney+, and more' },
    { name: 'Subscriptions', slug: 'subscriptions', icon: '⭐', sortOrder: 2, description: 'Premium subscriptions for popular services' },
    { name: 'Gift Cards', slug: 'gift-cards', icon: '🎁', sortOrder: 3, description: 'Digital gift cards for popular platforms' },
    { name: 'Gaming', slug: 'gaming', icon: '🎮', sortOrder: 4, description: 'Game keys, top-ups, and in-game currency' },
    { name: 'Software', slug: 'software', icon: '💻', sortOrder: 5, description: 'Software licenses and activation keys' },
    { name: 'Smart Projectors', slug: 'smart-projectors', icon: '📽️', sortOrder: 6, description: 'Physical smart projectors with delivery' },
  ]

  for (const c of categories) {
    const existing = await db.category.findUnique({ where: { slug: c.slug } })
    if (!existing) {
      await db.category.create({ data: c })
      console.log(`Created category: ${c.name}`)
    }
  }

  // Products
  const products = [
    // Streaming
    { name: 'Netflix Premium 1 Month', categoryName: 'Streaming', price: 850, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Netflix Premium 4K UHD — 1 month subscription', featured: true, stock: 50, licenseSource: 'Internal' },
    { name: 'Netflix Premium 3 Months', categoryName: 'Streaming', price: 2400, salePrice: 2200, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Netflix Premium 4K UHD — 3 months subscription', featured: true, stock: 30, licenseSource: 'Internal' },
    { name: 'Netflix Premium 6 Months', categoryName: 'Streaming', price: 4800, salePrice: 4200, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Netflix Premium 4K UHD — 6 months subscription', stock: 20, licenseSource: 'Internal' },
    { name: 'Netflix Premium 12 Months', categoryName: 'Streaming', price: 9600, salePrice: 8000, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Netflix Premium 4K UHD — 12 months subscription', featured: true, stock: 15, licenseSource: 'Internal' },
    { name: 'Amazon Prime Video 1 Month', categoryName: 'Streaming', price: 600, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Amazon Prime Video — 1 month subscription', stock: 40, licenseSource: 'Internal' },
    { name: 'Amazon Prime Video 3 Months', categoryName: 'Streaming', price: 1700, salePrice: 1500, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Amazon Prime Video — 3 months subscription', stock: 25, licenseSource: 'Internal' },
    { name: 'Disney+ Premium 1 Month', categoryName: 'Streaming', price: 700, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Disney+ Premium — 1 month subscription', stock: 35, licenseSource: 'Internal' },
    { name: 'Disney+ Premium 12 Months', categoryName: 'Streaming', price: 7200, salePrice: 6000, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Disney+ Premium — 12 months subscription', featured: true, stock: 12, licenseSource: 'Internal' },
    { name: 'YouTube Premium 1 Month', categoryName: 'Streaming', price: 550, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'YouTube Premium ad-free — 1 month', stock: 40, licenseSource: 'Internal' },
    { name: 'YouTube Premium 3 Months', categoryName: 'Streaming', price: 1500, salePrice: 1300, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'YouTube Premium ad-free — 3 months', stock: 25, licenseSource: 'Internal' },
    { name: 'Spotify Premium 1 Month', categoryName: 'Streaming', price: 500, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Spotify Premium ad-free music — 1 month', stock: 50, licenseSource: 'Internal' },
    { name: 'Spotify Premium 3 Months', categoryName: 'Streaming', price: 1400, salePrice: 1200, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Spotify Premium ad-free music — 3 months', stock: 30, licenseSource: 'Internal' },
    { name: 'Spotify Premium 12 Months', categoryName: 'Streaming', price: 5000, salePrice: 4200, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Spotify Premium ad-free music — 12 months', featured: true, stock: 15, licenseSource: 'Internal' },

    // Subscriptions
    { name: 'ChatGPT Plus 1 Month', categoryName: 'Subscriptions', price: 1200, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'ChatGPT Plus subscription — 1 month', featured: true, stock: 30, licenseSource: 'Internal' },
    { name: 'ChatGPT Plus 3 Months', categoryName: 'Subscriptions', price: 3400, salePrice: 3000, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'ChatGPT Plus subscription — 3 months', stock: 20, licenseSource: 'Internal' },
    { name: 'Canva Pro 1 Month', categoryName: 'Subscriptions', price: 600, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Canva Pro design suite — 1 month', stock: 40, licenseSource: 'Internal' },
    { name: 'Canva Pro 12 Months', categoryName: 'Subscriptions', price: 6000, salePrice: 4800, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Canva Pro design suite — 12 months', featured: true, stock: 15, licenseSource: 'Internal' },
    { name: 'Adobe Creative Cloud 1 Month', categoryName: 'Subscriptions', price: 3500, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'Adobe Creative Cloud All Apps — 1 month', stock: 20, licenseSource: 'Internal' },
    { name: 'LinkedIn Premium 1 Month', categoryName: 'Subscriptions', price: 1800, type: 'SUBSCRIPTION', deliveryType: 'INSTANT', description: 'LinkedIn Premium Career — 1 month', stock: 25, licenseSource: 'Internal' },

    // Gift Cards
    { name: 'Google Play Gift Card $10', categoryName: 'Gift Cards', price: 3200, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Google Play Gift Card — $10 USD', stock: 50, licenseSource: 'Supplier A' },
    { name: 'Google Play Gift Card $25', categoryName: 'Gift Cards', price: 7800, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Google Play Gift Card — $25 USD', stock: 40, licenseSource: 'Supplier A' },
    { name: 'Google Play Gift Card $50', categoryName: 'Gift Cards', price: 15500, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Google Play Gift Card — $50 USD', featured: true, stock: 30, licenseSource: 'Supplier A' },
    { name: 'Apple iTunes Gift Card $10', categoryName: 'Gift Cards', price: 3300, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Apple iTunes Gift Card — $10 USD', stock: 45, licenseSource: 'Supplier A' },
    { name: 'Apple iTunes Gift Card $25', categoryName: 'Gift Cards', price: 8000, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Apple iTunes Gift Card — $25 USD', stock: 35, licenseSource: 'Supplier A' },
    { name: 'Apple iTunes Gift Card $50', categoryName: 'Gift Cards', price: 15800, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Apple iTunes Gift Card — $50 USD', stock: 25, licenseSource: 'Supplier A' },
    { name: 'Steam Gift Card $10', categoryName: 'Gift Cards', price: 3400, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Steam Wallet Gift Card — $10 USD', stock: 40, licenseSource: 'Supplier A' },
    { name: 'Steam Gift Card $20', categoryName: 'Gift Cards', price: 6500, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Steam Wallet Gift Card — $20 USD', stock: 35, licenseSource: 'Supplier A' },
    { name: 'Amazon Gift Card $25', categoryName: 'Gift Cards', price: 8000, type: 'GIFT_CARD', deliveryType: 'INSTANT', description: 'Amazon.com Gift Card — $25 USD', stock: 30, licenseSource: 'Supplier A' },

    // Gaming
    { name: 'PUBG Mobile UC 60', categoryName: 'Gaming', price: 350, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'PUBG Mobile 60 Unknown Cash (UC)', stock: 100, licenseSource: 'Internal' },
    { name: 'PUBG Mobile UC 325', categoryName: 'Gaming', price: 1700, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'PUBG Mobile 325 Unknown Cash (UC)', featured: true, stock: 80, licenseSource: 'Internal' },
    { name: 'PUBG Mobile UC 660', categoryName: 'Gaming', price: 3300, salePrice: 3000, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'PUBG Mobile 660 Unknown Cash (UC)', stock: 60, licenseSource: 'Internal' },
    { name: 'PUBG Mobile UC 1800', categoryName: 'Gaming', price: 8500, salePrice: 7800, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'PUBG Mobile 1800 Unknown Cash (UC)', stock: 40, licenseSource: 'Internal' },
    { name: 'Free Fire Diamonds 100', categoryName: 'Gaming', price: 150, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'Free Fire 100 Diamonds', stock: 100, licenseSource: 'Internal' },
    { name: 'Free Fire Diamonds 520', categoryName: 'Gaming', price: 700, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'Free Fire 520 Diamonds', featured: true, stock: 80, licenseSource: 'Internal' },
    { name: 'Free Fire Diamonds 1080', categoryName: 'Gaming', price: 1400, salePrice: 1200, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'Free Fire 1080 Diamonds', stock: 60, licenseSource: 'Internal' },
    { name: 'Call of Duty Mobile CP 400', categoryName: 'Gaming', price: 700, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'COD Mobile 400 CP Points', stock: 50, licenseSource: 'Internal' },
    { name: 'Call of Duty Mobile CP 800', categoryName: 'Gaming', price: 1400, type: 'DIGITAL', deliveryType: 'INSTANT', description: 'COD Mobile 800 CP Points', stock: 40, licenseSource: 'Internal' },

    // Software
    { name: 'Windows 11 Pro Activation Key', categoryName: 'Software', price: 2500, type: 'SOFTWARE', deliveryType: 'INSTANT', description: 'Windows 11 Pro genuine activation key', featured: true, stock: 30, licenseSource: 'Supplier B' },
    { name: 'Windows 11 Home Activation Key', categoryName: 'Software', price: 1800, type: 'SOFTWARE', deliveryType: 'INSTANT', description: 'Windows 11 Home genuine activation key', stock: 25, licenseSource: 'Supplier B' },
    { name: 'Office 2021 Professional Plus', categoryName: 'Software', price: 3500, type: 'SOFTWARE', deliveryType: 'INSTANT', description: 'Microsoft Office 2021 Professional Plus license', featured: true, stock: 20, licenseSource: 'Supplier B' },
    { name: 'Office 365 1 Year', categoryName: 'Software', price: 5500, salePrice: 4800, type: 'SOFTWARE', deliveryType: 'INSTANT', description: 'Microsoft 365 (Office 365) — 1 year subscription', stock: 15, licenseSource: 'Supplier B' },
    { name: 'Antivirus Premium 1 Year', categoryName: 'Software', price: 1200, type: 'SOFTWARE', deliveryType: 'INSTANT', description: 'Premium antivirus protection — 1 year license', stock: 40, licenseSource: 'Supplier B' },
    { name: 'VPN Premium 1 Year', categoryName: 'Software', price: 2000, salePrice: 1500, type: 'SOFTWARE', deliveryType: 'INSTANT', description: 'Premium VPN service — 1 year subscription', stock: 30, licenseSource: 'Supplier B' },

    // Smart Projectors (physical)
    { name: 'PlayBeat Smart Projector P1', categoryName: 'Smart Projectors', price: 45000, type: 'HARDWARE', deliveryType: 'PHYSICAL', description: '1080p Smart Projector with Android TV, built-in speakers, WiFi, Bluetooth. 4000 lumens.', longDescription: 'The PlayBeat P1 Smart Projector brings cinema-quality entertainment to your home. Features include:\n\n• Native 1080p Full HD resolution\n• 4000 lumens brightness\n• Android TV 11.0 built-in\n• WiFi 6 + Bluetooth 5.0\n• Built-in 10W stereo speakers\n• Auto keystone correction\n• 50,000-hour LED lifespan\n• 100-300 inch projection size\n• HDMI x2, USB x2, AV, Audio out\n• Remote control included', featured: true, stock: 10, images: JSON.stringify(['projector-p1-main.jpg']) },
    { name: 'PlayBeat Smart Projector P2 Pro', categoryName: 'Smart Projectors', price: 75000, salePrice: 68000, type: 'HARDWARE', deliveryType: 'PHYSICAL', description: '4K Smart Projector with Android TV, Dolby Audio, 6000 lumens. Premium home cinema.', longDescription: 'The PlayBeat P2 Pro is our flagship 4K smart projector for the ultimate home cinema experience:\n\n• Native 4K UHD resolution (3840x2160)\n• 6000 lumens ultra-bright\n• Android TV 12.0 with Google Assistant\n• Dolby Audio + DTS-HD\n• WiFi 6E + Bluetooth 5.2\n• Auto focus + auto keystone\n• HDR10+ support\n• 50,000-hour laser-LED hybrid\n• 80-400 inch projection size\n• 3x HDMI, 2x USB, Optical out\n• Premium aluminum body', featured: true, stock: 5, images: JSON.stringify(['projector-p2-main.jpg']) },
    { name: 'PlayBeat Mini Portable Projector', categoryName: 'Smart Projectors', price: 22000, type: 'HARDWARE', deliveryType: 'PHYSICAL', description: 'Portable 720p mini projector with built-in battery, 2000 lumens. Perfect for outdoor movies.', stock: 15, images: JSON.stringify(['projector-mini-main.jpg']) },
    { name: 'PlayBeat Projector Screen 100 inch', categoryName: 'Smart Projectors', price: 8500, type: 'HARDWARE', deliveryType: 'PHYSICAL', description: '100-inch motorized projector screen with remote control. Matte white 16:9.', stock: 20, images: JSON.stringify(['screen-100-main.jpg']) },
    { name: 'PlayBeat Projector Mount', categoryName: 'Smart Projectors', price: 3500, type: 'HARDWARE', deliveryType: 'PHYSICAL', description: 'Universal ceiling mount for projectors. Adjustable, supports up to 15kg.', stock: 30, images: JSON.stringify(['mount-main.jpg']) },
  ]

  for (const p of products) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const existing = await db.product.findUnique({ where: { slug } })
    if (existing) {
      // Update stock if product exists
      await db.product.update({ where: { id: existing.id }, data: { stock: p.stock } })
      continue
    }
    await db.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        longDescription: p.longDescription || null,
        categoryName: p.categoryName,
        price: p.price,
        salePrice: p.salePrice || null,
        currency: 'PKR',
        type: p.type,
        deliveryType: p.deliveryType,
        stock: p.stock,
        unlimited: false,
        licenseSource: p.licenseSource || null,
        images: p.images || '[]',
        variants: '[]',
        status: 'ACTIVE',
        featured: p.featured || false,
        visibility: 'PUBLIC',
      },
    })
  }
  console.log(`Processed ${products.length} products`)

  // Add sample license keys for a few products
  const netflix1m = await db.product.findUnique({ where: { slug: 'netflix-premium-1-month' } })
  if (netflix1m) {
    const existingLicenses = await db.license.count({ where: { productId: netflix1m.id } })
    if (existingLicenses < 3) {
      for (let i = 0; i < 3; i++) {
        await db.license.create({
          data: {
            productId: netflix1m.id,
            productName: netflix1m.name,
            licenseKey: `NF1M-${Date.now().toString(36).toUpperCase()}-${i}`,
            supplier: 'Internal',
            status: 'AVAILABLE',
          },
        })
      }
      console.log('Added 3 sample Netflix licenses')
    }
  }

  const spotify1m = await db.product.findUnique({ where: { slug: 'spotify-premium-1-month' } })
  if (spotify1m) {
    const existingLicenses = await db.license.count({ where: { productId: spotify1m.id } })
    if (existingLicenses < 3) {
      for (let i = 0; i < 3; i++) {
        await db.license.create({
          data: {
            productId: spotify1m.id,
            productName: spotify1m.name,
            licenseKey: `SP1M-${Date.now().toString(36).toUpperCase()}-${i}`,
            supplier: 'Internal',
            status: 'AVAILABLE',
          },
        })
      }
      console.log('Added 3 sample Spotify licenses')
    }
  }

  const win11pro = await db.product.findUnique({ where: { slug: 'windows-11-pro-activation-key' } })
  if (win11pro) {
    const existingLicenses = await db.license.count({ where: { productId: win11pro.id } })
    if (existingLicenses < 3) {
      for (let i = 0; i < 3; i++) {
        await db.license.create({
          data: {
            productId: win11pro.id,
            productName: win11pro.name,
            licenseKey: `W11P-${Date.now().toString(36).toUpperCase()}-${i}`,
            supplier: 'Supplier B',
            status: 'AVAILABLE',
          },
        })
      }
      console.log('Added 3 sample Windows 11 Pro licenses')
    }
  }

  console.log('Commerce seed completed.')
}

main()
  .catch((e) => { console.error('seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
