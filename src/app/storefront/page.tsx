'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wordmark, CookieBanner, formatPrice } from '@/components/pb/brand'
import { ProductCard, type ProductData } from '@/components/pb/product-card'
import { Search, ShoppingCart, Star, Zap, Download, Tag, Package, X, Plus, Minus, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'

interface CartItem {
  product: Product
  quantity: number
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<ProductData[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState('featured')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '100')
      if (search) qs.set('search', search)
      if (categoryFilter !== 'all') qs.set('category', categoryFilter)
      if (typeFilter !== 'all') qs.set('type', typeFilter)
      if (sort === 'featured') qs.set('featured', 'true')
      const r = await api<{ products: ProductData[] }>(`/api/products?${qs.toString()}`)
      let list = r.products || []
      if (sort === 'price_low') list = [...list].sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))
      if (sort === 'price_high') list = [...list].sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price))
      setProducts(list)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => {
    api<{ categories: any[] }>('/api/categories').then((r) => setCategories(r.categories || [])).catch(() => {})
  }, [])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search, categoryFilter, typeFilter, sort])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('playbeat-cart')
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => { localStorage.setItem('playbeat-cart', JSON.stringify(cart)) }, [cart])

  function addToCart(product: ProductData) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    toast.success(`${product.name} added to cart`)
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const cartTotal = cart.reduce((sum, i) => sum + (i.product.salePrice || i.product.price) * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="min-h-screen bg-cloud">
      {/* Header — enterprise premium wordmark */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Wordmark size="md" />
            </Link>
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">Storefront</Badge>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCartOpen(true)} className="relative h-9">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gold text-navy text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
            <Link href="/crm"><Button variant="ghost" size="sm" className="hidden md:flex h-9">CRM</Button></Link>
            <Link href="/admin"><Button variant="ghost" size="sm" className="hidden md:flex h-9">Admin</Button></Link>
          </div>
        </div>
      </header>

      {/* Category bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto custom-scroll">
          <button onClick={() => setCategoryFilter('all')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors', categoryFilter === 'all' ? 'bg-navy text-white' : 'bg-cloud text-slate-600 hover:bg-slate-200')}>All Products</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryFilter(c.name)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors', categoryFilter === c.name ? 'bg-navy text-white' : 'bg-cloud text-slate-600 hover:bg-slate-200')}>
              {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="DIGITAL">Digital</SelectItem>
              <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
              <SelectItem value="GIFT_CARD">Gift Card</SelectItem>
              <SelectItem value="SOFTWARE">Software</SelectItem>
              <SelectItem value="GAMING">Gaming</SelectItem>
              <SelectItem value="HARDWARE">Hardware</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-slate-500">{products.length} products</div>
      </div>

      {/* Product grid — uses unified ProductCard */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pb-card p-4 h-64 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Package className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p>No products found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2 text-navy"><ShoppingCart className="w-5 h-5" /> Cart ({cartCount})</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCartOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  <p className="text-sm">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-2 border border-slate-100 rounded-lg">
                    <div className="w-12 h-12 rounded bg-cloud flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-navy">{item.product.name}</div>
                      <div className="text-xs text-navy font-semibold">{formatPrice(item.product.salePrice || item.product.price, item.product.currency || 'PKR')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.product.id, -1)}><Minus className="w-3 h-3" /></Button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.product.id, 1)}><Plus className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.product.id)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-lg font-bold text-navy">{formatPrice(cartTotal, 'PKR')}</span>
                </div>
                {/* Gold CTA — only for primary checkout action */}
                <button className="w-full pb-cta-gold py-2.5 rounded-md text-sm" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout dialog */}
      {checkoutOpen && (
        <CheckoutDialog cart={cart} total={cartTotal} onClose={() => setCheckoutOpen(false)} onSuccess={() => { setCart([]); setCheckoutOpen(false) }} />
      )}

      {/* Cookie banner */}
      <CookieBanner />
    </div>
  )
}

function CheckoutDialog({ cart, total, onClose, onSuccess }: { cart: CartItem[]; total: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', whatsapp: '', paymentMethod: 'EASYPAISA', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!form.name || !form.email) { toast.error('Name and email required'); return }
    setSubmitting(true)
    try {
      const orderData = {
        customerName: form.name, customerEmail: form.email, customerPhone: form.phone, customerWhatsapp: form.whatsapp,
        paymentMethod: form.paymentMethod, notes: form.notes,
        items: cart.map((i) => ({ productId: i.product.id, productName: i.product.name, price: i.product.salePrice || i.product.price, qty: i.quantity, productType: i.product.type || 'DIGITAL' })),
        subtotal: total, total, currency: 'PKR',
      }
      const r = await api<{ order: any }>('/api/orders', { method: 'POST', body: JSON.stringify(orderData) })
      toast.success(`Order ${r.order.orderNumber} created! Payment: ${r.order.paymentStatus}`)
      onSuccess()
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-navy">Checkout</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-cloud p-3 text-sm space-y-1">
            {cart.map((i) => (
              <div key={i.product.id} className="flex justify-between">
                <span>{i.product.name} × {i.quantity}</span>
                <span className="font-medium">{formatPrice((i.product.salePrice || i.product.price) * i.quantity, 'PKR')}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-navy">
              <span>Total</span><span>{formatPrice(total, 'PKR')}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><label className="text-xs text-slate-600">Full Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs text-slate-600">Email *</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-xs text-slate-600">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><label className="text-xs text-slate-600">WhatsApp Number</label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+92..." /></div>
            <div className="space-y-1 col-span-2"><label className="text-xs text-slate-600">Payment Method</label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASYPAISA">EasyPaisa</SelectItem>
                  <SelectItem value="JAZZCASH">JazzCash</SelectItem>
                  <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CRYPTO">Cryptocurrency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Payment is in PENDING state until a gateway is configured. Admin can mark orders as PAID from the Admin panel.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button onClick={submit} disabled={submitting} className="pb-cta-gold text-sm px-4 py-2 rounded-md">
            {submitting ? 'Creating…' : 'Place Order'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
