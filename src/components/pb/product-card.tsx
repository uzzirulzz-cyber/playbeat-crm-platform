'use client'

import { Star, Zap, Clock, Download, Tag, Package, ShoppingBag, TrendingUp } from 'lucide-react'
import { formatPrice } from './brand'
import { cn } from '@/lib/utils'

export interface ProductData {
  id: string
  name: string
  slug?: string
  description?: string
  categoryName?: string
  price: number
  salePrice?: number | null
  currency?: string
  type?: string
  deliveryType?: string
  stock?: number
  unlimited?: boolean
  featured?: boolean
  status?: string
  createdAt?: string
  images?: string | string[]
}

interface ProductCardProps {
  product: ProductData
  onAddToCart?: (product: ProductData) => void
  compact?: boolean
}

const TYPE_ICONS: Record<string, any> = {
  DIGITAL: Download,
  SUBSCRIPTION: Zap,
  GIFT_CARD: Tag,
  SOFTWARE: Package,
  GAMING: Star,
  HARDWARE: Package,
  SERVICE: Package,
}

/**
 * Unified ProductCard — handles all states:
 * Featured, Discount, New, Popular, Instant, OutOfStock
 */
export function ProductCard({ product, onAddToCart, compact }: ProductCardProps) {
  const Icon = TYPE_ICONS[product.type || 'DIGITAL'] || Package
  const onSale = product.salePrice && product.salePrice < product.price
  const discountPct = onSale ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100) : 0
  const outOfStock = !product.unlimited && (product.stock ?? 0) <= 0
  const isInstant = product.deliveryType === 'INSTANT'
  const isNew = product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
  const isPopular = (product.featured || false) && !onSale && !isNew
  const currency = product.currency || 'PKR'

  return (
    <div className={cn('pb-card overflow-hidden flex flex-col group', compact && 'pb-card-compact')}>
      {/* Image area */}
      <div className="aspect-video bg-gradient-to-br from-cloud to-slate-100 flex items-center justify-center relative overflow-hidden">
        <Icon className="w-12 h-12 text-slate-400 group-hover:scale-110 transition-transform duration-300" />

        {/* Badge stack — top-left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.featured && (
            <span className="pb-badge pb-badge-featured">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
          {onSale && (
            <span className="pb-badge pb-badge-discount">
              -{discountPct}%
            </span>
          )}
          {isNew && !onSale && (
            <span className="pb-badge pb-badge-new">New</span>
          )}
          {isPopular && !product.featured && (
            <span className="pb-badge pb-badge-popular">
              <TrendingUp className="w-2.5 h-2.5" /> Popular
            </span>
          )}
        </div>

        {/* Instant delivery badge — top-right */}
        {isInstant && !outOfStock && (
          <div className="absolute top-2 right-2">
            <span className="pb-badge pb-badge-instant">
              <Zap className="w-2.5 h-2.5" /> Instant
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-navy/60 flex items-center justify-center">
            <span className="pb-badge pb-badge-out-of-stock text-sm">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Category + type */}
        <div className="flex items-center gap-1 mb-1">
          {product.categoryName && (
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
              {product.categoryName}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-sm text-navy leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        {!compact && product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{product.description}</p>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {onSale ? (
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 line-through">
                  {formatPrice(product.price, currency)}
                </span>
                <span className="font-bold text-navy text-base">
                  {formatPrice(product.salePrice as number, currency)}
                </span>
              </div>
            ) : (
              <span className="font-bold text-navy text-base">
                {formatPrice(product.price, currency)}
              </span>
            )}
          </div>

          {/* Gold CTA — only for primary action, disabled if out of stock */}
          <button
            disabled={outOfStock}
            onClick={() => onAddToCart?.(product)}
            className={cn(
              'text-xs px-3 py-2 rounded-md font-semibold transition-all whitespace-nowrap',
              outOfStock
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'pb-cta-gold'
            )}
          >
            {outOfStock ? 'Sold Out' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
