'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ShoppingCart, Search, Menu, X, Package, Tag, Home, Phone, MessageCircle,
  User, ChevronRight, Star, Zap, Shield, Truck, CheckCircle, ArrowLeft,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

export default function StorefrontShell() {
  const { cart, addToCart, removeFromCart, clearCart, setAppMode, user } = useConsole()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [productDetail, setProductDetail] = useState<any | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        api<{ products: any[] }>('/api/products'),
        api<{ categories: any[] }>('/api/categories'),
      ])
      setProducts(p.products || [])
      setCategories(c.categories || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter((p) => {
    if (activeCategory && p.categoryName !== activeCategory) return false
    if (search) {
      const s = search.toLowerCase()
      return p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s)
    }
    return true
  })

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg pb-gradient-purple flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-lg leading-none">PlayBeat</div>
              <div className="text-[10px] text-zinc-500 leading-none mt-0.5">Digital Marketplace</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 ml-4">
            <button onClick={() => setAppMode('storefront')} className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-md">
              Storefront
            </button>
            {user && (
              <button onClick={() => setAppMode('crm')} className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md">
                CRM
              </button>
            )}
            {user && ['ADMIN','SUPER_ADMIN'].includes(user.role) && (
              <button onClick={() => setAppMode('admin')} className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md">
                Admin
              </button>
            )}
          </div>

          <div className="flex-1 max-w-md ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <Button variant="outline" size="sm" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full pb-gradient-purple text-white text-[10px] font-semibold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>

          {user ? (
            <Button variant="ghost" size="sm" onClick={() => setAppMode('crm')}>
              <User className="w-4 h-4 mr-1.5" /> {user.name.split(' ')[0]}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setAppMode('crm')} className="pb-gradient-purple border-0">
              Sign in
            </Button>
          )}
        </div>
      </header>

      {/* Hero banner */}
      {!search && !activeCategory && (
        <div className="pb-gradient-charcoal text-white">
          <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold">Premium Digital Marketplace</h1>
              <p className="text-purple-200/80">Streaming subscriptions, gift cards, gaming top-ups, software licenses & smart projectors. Instant delivery.</p>
              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-sm"><Zap className="w-4 h-4 text-yellow-400" /> Instant delivery</div>
                <div className="flex items-center gap-1.5 text-sm"><Shield className="w-4 h-4 text-emerald-400" /> Genuine products</div>
                <div className="flex items-center gap-1.5 text-sm"><Truck className="w-4 h-4 text-blue-400" /> Fast shipping</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {categories.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.name)}
                  className="bg-purple-900/30 hover:bg-purple-900/50 rounded-lg p-4 text-center transition-colors border border-purple-900/30"
                >
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="text-xs font-medium">{c.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category pills */}
      <div className="border-b border-zinc-200 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto custom-scroll">
          <button
            onClick={() => setActiveCategory('')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              !activeCategory ? 'pb-gradient-purple text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.name)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                activeCategory === c.name ? 'pb-gradient-purple text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Package className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p>No products found.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {activeCategory || 'All Products'}
                <span className="text-sm text-zinc-500 font-normal ml-2">({filtered.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={() => { addToCart(p); toast.success(`${p.name} added to cart`) }} onView={() => setProductDetail(p)} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded pb-gradient-purple flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/></svg>
              </div>
              <span className="font-bold">PlayBeat Digital</span>
            </div>
            <p className="text-xs text-zinc-500">Premium digital marketplace & smart projectors. One platform, every digital need.</p>
          </div>
          <div>
            <div className="font-medium mb-2">Products</div>
            {categories.slice(0, 4).map((c) => (
              <button key={c.id} onClick={() => setActiveCategory(c.name)} className="block text-xs text-zinc-500 hover:text-purple-600 mb-1">{c.name}</button>
            ))}
          </div>
          <div>
            <div className="font-medium mb-2">Support</div>
            <div className="text-xs text-zinc-500 space-y-1">
              <div>Help Center</div>
              <div>Track Order</div>
              <div>Returns</div>
              <div>Contact Us</div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Company</div>
            <div className="text-xs text-zinc-500 space-y-1">
              <div>About PlayBeat</div>
              <div>Terms of Service</div>
              <div>Privacy Policy</div>
              <div>Refund Policy</div>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400">
          © 2026 PlayBeat Digital. All rights reserved.
        </div>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }}
        />
      )}

      {/* Checkout dialog */}
      {checkoutOpen && (
        <CheckoutDialog
          cart={cart}
          total={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => { clearCart(); setCheckoutOpen(false); toast.success('Order placed successfully!') }}
        />
      )}

      {/* Product detail dialog */}
      {productDetail && (
        <Dialog open onOpenChange={() => setProductDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{productDetail.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{productDetail.type}</Badge>
                {productDetail.featured && <Badge className="bg-amber-100 text-amber-700">⭐ Featured</Badge>}
                {productDetail.deliveryType === 'INSTANT' && <Badge className="bg-emerald-100 text-emerald-700"><Zap className="w-3 h-3 mr-1" /> Instant delivery</Badge>}
              </div>
              <p className="text-sm text-zinc-600">{productDetail.description}</p>
              {productDetail.longDescription && (
                <pre className="text-sm text-zinc-600 whitespace-pre-wrap font-sans bg-zinc-50 p-3 rounded-md">{productDetail.longDescription}</pre>
              )}
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                <div className="flex items-baseline gap-2">
                  {productDetail.salePrice ? (
                    <>
                      <span className="text-2xl font-bold text-purple-700">PKR {productDetail.salePrice.toLocaleString()}</span>
                      <span className="text-sm text-zinc-400 line-through">PKR {productDetail.price.toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-purple-700">PKR {productDetail.price.toLocaleString()}</span>
                  )}
                </div>
                <Button
                  className="ml-auto pb-gradient-purple border-0"
                  onClick={() => { addToCart(productDetail); toast.success(`${productDetail.name} added to cart`); setProductDetail(null) }}
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" /> Add to Cart
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function ProductCard({ product, onAdd, onView }: { product: any; onAdd: () => void; onView: () => void }) {
  const hasSale = product.salePrice && product.salePrice < product.price
  const discount = hasSale ? Math.round(((product.price - product.salePrice) / product.price) * 100) : 0
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" >
      <CardContent className="p-0">
        <div onClick={onView} className="aspect-square pb-gradient-charcoal flex items-center justify-center relative overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-12 h-12 text-purple-400/50 group-hover:scale-110 transition-transform" />
          )}
          {hasSale && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
          )}
          {product.featured && (
            <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
        </div>
        <div className="p-3 space-y-1.5">
          <div onClick={onView} className="font-medium text-sm line-clamp-2 min-h-[2.5rem] hover:text-purple-700">{product.name}</div>
          <div className="flex items-baseline gap-1.5">
            {hasSale ? (
              <>
                <span className="font-bold text-purple-700">PKR {(product.salePrice || 0).toLocaleString()}</span>
                <span className="text-xs text-zinc-400 line-through">{product.price.toLocaleString()}</span>
              </>
            ) : (
              <span className="font-bold text-purple-700">PKR {product.price.toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {product.deliveryType === 'INSTANT' && <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300"><Zap className="w-2.5 h-2.5 mr-0.5" /> Instant</Badge>}
            {product.type === 'HARDWARE' && <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300"><Truck className="w-2.5 h-2.5 mr-0.5" /> Physical</Badge>}
            {product.stock <= 5 && product.stock > 0 && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Only {product.stock} left</Badge>}
            {product.stock === 0 && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">Out of stock</Badge>}
          </div>
          <Button size="sm" className="w-full mt-1 pb-gradient-purple border-0" disabled={product.stock === 0} onClick={onAdd}>
            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CartDrawer({ cart, total, onClose, onRemove, onCheckout }: any) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Cart ({cart.length})</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <ShoppingCart className="w-12 h-12 mx-auto opacity-30 mb-2" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.map((item: any) => (
              <div key={item.productId} className="p-3 border-b border-zinc-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded pb-gradient-charcoal flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  <div className="text-xs text-zinc-500">PKR {item.price.toLocaleString()} × {item.qty}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">PKR {(item.price * item.qty).toLocaleString()}</div>
                  <button onClick={() => onRemove(item.productId)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Total</span>
              <span className="text-xl font-bold text-purple-700">PKR {total.toLocaleString()}</span>
            </div>
            <Button className="w-full pb-gradient-purple border-0" onClick={onCheckout}>
              Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckoutDialog({ cart, total, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', whatsapp: '', paymentMethod: 'EASYPAISA' })
  const [placing, setPlacing] = useState(false)

  async function placeOrder() {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return }
    setPlacing(true)
    try {
      await api('/api/orders', { method: 'POST', body: JSON.stringify({
        items: cart,
        customerName: form.name,
        customerEmail: form.email || null,
        customerPhone: form.phone,
        customerWhatsapp: form.whatsapp || form.phone,
        paymentMethod: form.paymentMethod,
        source: 'STOREFRONT',
      }) })
      onSuccess()
    } catch (e: any) { toast.error(e.message) } finally { setPlacing(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-purple-50 border border-purple-200 p-3 text-sm">
            <div className="font-medium mb-1">Order Summary</div>
            {cart.map((item: any) => (
              <div key={item.productId} className="flex justify-between text-xs text-zinc-600">
                <span>{item.name} × {item.qty}</span>
                <span>PKR {(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-1 border-t border-purple-200 mt-1">
              <span>Total</span>
              <span className="text-purple-700">PKR {total.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Full Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Khan" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Phone *</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 1234567" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="Same as phone" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Email (optional)</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ahmed@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['EASYPAISA', 'JAZZCASH', 'BANK', 'CARD'].map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, paymentMethod: m })}
                  className={cn('px-3 py-2 rounded-md text-xs font-medium border transition-colors',
                    form.paymentMethod === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-zinc-200 text-zinc-600 hover:border-purple-300')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-zinc-500 bg-amber-50 border border-amber-200 rounded-md p-2">
            ⚠️ Payment gateway not configured. Order will be created as PENDING — an admin will confirm payment manually.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={placeOrder} disabled={placing} className="pb-gradient-purple border-0">
            {placing ? 'Placing…' : `Place Order — PKR ${total.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
