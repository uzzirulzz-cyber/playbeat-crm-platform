'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Settings,
  Tag, DollarSign, License, Server, ArrowLeft, Plus, Pencil, Trash2,
  TrendingUp, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole, hasMinRole } from '@/lib/console-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import LoginView from '@/components/console/login'

type AdminView = 'dashboard' | 'products' | 'orders' | 'customers' | 'analytics' | 'settings'

export default function AdminPage() {
  const { user, setUser } = useConsole()
  const [view, setView] = useState<AdminView>('dashboard')
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    api<{ user: any }>('/api/me', {}).then((r) => { if (r?.user) setUser(r.user) }).catch(() => {}).finally(() => setBooting(false))
  }, [setUser])

  if (booting) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-400 text-sm">Loading Admin…</div>
  if (!user) return <LoginView />
  if (!hasMinRole(user, 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Card className="max-w-md"><CardContent className="p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-zinc-500 mb-4">You need Admin or Super Admin role to access this panel.</p>
          <Link href="/crm"><Button>Back to CRM</Button></Link>
        </CardContent></Card>
      </div>
    )
  }

  const nav: { key: AdminView; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'orders', label: 'Orders', icon: ShoppingCart },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-cloud">
      {/* Sidebar — enterprise navy */}
      <aside className="w-60 shrink-0 flex flex-col bg-navy text-silver border-r border-navy-light">
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-navy-light">
          <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-navy" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">PlayBeat Admin</span>
            <span className="text-[10px] text-silver-dark -mt-0.5">Control Center</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scroll">
          {nav.map((n) => {
            const Icon = n.icon
            return (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  view === n.key ? 'bg-gold text-navy font-semibold' : 'text-silver hover:bg-navy-light hover:text-white')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{n.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="border-t border-navy-light p-3 space-y-1">
          <Link href="/" className="flex items-center gap-2 text-xs text-silver-dark hover:text-white px-2 py-1.5">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
          <Link href="/crm" className="flex items-center gap-2 text-xs text-silver-dark hover:text-white px-2 py-1.5">
            <Users className="w-3 h-3" /> Open CRM
          </Link>
          <Link href="/storefront" className="flex items-center gap-2 text-xs text-silver-dark hover:text-white px-2 py-1.5">
            <Package className="w-3 h-3" /> View Storefront
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scroll">
        {view === 'dashboard' && <AdminDashboard setView={setView} />}
        {view === 'products' && <AdminProducts />}
        {view === 'orders' && <AdminOrders />}
        {view === 'customers' && <AdminCustomers />}
        {view === 'analytics' && <AdminAnalytics />}
        {view === 'settings' && <AdminSettings />}
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function AdminDashboard({ setView }: { setView: (v: AdminView) => void }) {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api<{ products: any[] }>('/api/products?limit=500'),
      api<{ orders: any[] }>('/api/orders'),
      api<any>('/api/analytics'),
    ]).then(([p, o, a]) => {
      setStats({
        products: p.products?.length || 0,
        orders: o.orders?.length || 0,
        leads: a.totals?.totalLeads || 0,
        messages: a.totals?.totalMessages || 0,
        calls: a.totals?.totalCalls || 0,
        revenue: 0,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500">Platform overview — shared data across storefront, CRM, and admin.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Package} label="Products" value={stats?.products || 0} color="text-purple-600" onClick={() => setView('products')} />
        <StatCard icon={ShoppingCart} label="Orders" value={stats?.orders || 0} color="text-blue-600" onClick={() => setView('orders')} />
        <StatCard icon={Users} label="Leads" value={stats?.leads || 0} color="text-emerald-600" onClick={() => setView('customers')} />
        <StatCard icon={TrendingUp} label="Messages" value={stats?.messages || 0} color="text-amber-600" />
        <StatCard icon={Server} label="Calls" value={stats?.calls || 0} color="text-cyan-600" />
        <StatCard icon={DollarSign} label="Revenue" value={`PKR ${(stats?.revenue || 0).toFixed(0)}`} color="text-pink-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setView('products')}>
              <Plus className="w-4 h-4 mr-2" /> Add new product
            </Button>
            <Link href="/storefront"><Button variant="outline" size="sm" className="w-full justify-start">
              <Package className="w-4 h-4 mr-2" /> View storefront
            </Button></Link>
            <Link href="/crm"><Button variant="outline" size="sm" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" /> Open CRM
            </Button></Link>
            <Link href="/admin"><Button variant="outline" size="sm" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" /> System settings
            </Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">System Health</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <HealthRow label="Database" ok />
            <HealthRow label="WhatsApp API" ok={false} note="Not connected" />
            <HealthRow label="Telephony (mock)" ok />
            <HealthRow label="Meta CAPI" ok />
            <HealthRow label="Email/SMTP" ok={false} note="Not configured" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, onClick }: any) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">{label}</span>
            <Icon className={cn('w-3.5 h-3.5', color)} />
          </div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        </CardContent>
      </Card>
    </button>
  )
}

function HealthRow({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-600">{label}</span>
      {ok ? (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-xs">OK</Badge>
      ) : (
        <Badge variant="outline" className="text-zinc-500 text-xs">{note || 'Not configured'}</Badge>
      )}
    </div>
  )
}

// ─── Products ────────────────────────────────────────────────────────────────
function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ products: any[] }>('/api/products?pageSize=100')
      setProducts(r.products || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-zinc-500">{products.length} products in catalog — shared with storefront.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Product</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Type</th>
                <th className="text-left font-medium px-3 py-2.5">Category</th>
                <th className="text-left font-medium px-3 py-2.5">Price</th>
                <th className="text-left font-medium px-3 py-2.5">Stock</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium">{p.name}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{p.type}</Badge></td>
                  <td className="px-3 py-2.5 text-zinc-600">{p.categoryName || '—'}</td>
                  <td className="px-3 py-2.5 font-medium">{p.currency} {p.salePrice || p.price}</td>
                  <td className="px-3 py-2.5">{p.unlimited ? '∞' : p.stock}</td>
                  <td className="px-3 py-2.5"><Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {(creating || editing) && <ProductDialog product={editing} onClose={() => { setCreating(false); setEditing(null) }} onSaved={() => { setCreating(false); setEditing(null); load() }} />}
    </div>
  )
}

function ProductDialog({ product, onClose, onSaved }: { product: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(product ? { ...product } : {
    name: '', description: '', price: 0, salePrice: '', currency: 'PKR',
    type: 'DIGITAL', deliveryType: 'INSTANT', stock: 0, unlimited: false,
    status: 'ACTIVE', featured: false, categoryName: ''
  })

  async function save() {
    if (!form.name?.trim()) { toast.error('Name required'); return }
    try {
      const body: any = {
        name: form.name,
        description: form.description || null,
        price: Number(form.price || 0),
        salePrice: form.salePrice ? Number(form.salePrice) : null,
        currency: form.currency || 'PKR',
        type: form.type,
        deliveryType: form.deliveryType,
        stock: Number(form.stock || 0),
        unlimited: !!form.unlimited,
        status: form.status,
        featured: !!form.featured,
        categoryName: form.categoryName || null,
      }
      if (product) {
        await api(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Product updated')
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Product created')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price *</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sale Price (optional)</Label>
            <Input type="number" value={form.salePrice || ''} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Input value={form.categoryName || ''} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Product Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIGITAL">Digital</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                <SelectItem value="GIFT_CARD">Gift Card</SelectItem>
                <SelectItem value="SOFTWARE">Software</SelectItem>
                <SelectItem value="GAMING">Gaming</SelectItem>
                <SelectItem value="HARDWARE">Hardware</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Delivery Type</Label>
            <Select value={form.deliveryType} onValueChange={(v) => setForm({ ...form, deliveryType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTANT">Instant</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="PHYSICAL">Physical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stock</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={form.unlimited} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.unlimited} onChange={(e) => setForm({ ...form, unlimited: e.target.checked })} />
              Unlimited stock
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured product
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{product ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Orders ──────────────────────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ orders: any[] }>('/api/orders')
      setOrders(r.orders || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, field: 'paymentStatus' | 'fulfillmentStatus', value: string) {
    try {
      await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) })
      toast.success(`Order ${field} updated to ${value}`)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-zinc-500">{orders.length} orders — customers from storefront sync to CRM.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Order #</th>
                <th className="text-left font-medium px-3 py-2.5">Customer</th>
                <th className="text-left font-medium px-3 py-2.5">Total</th>
                <th className="text-left font-medium px-3 py-2.5">Payment</th>
                <th className="text-left font-medium px-3 py-2.5">Fulfillment</th>
                <th className="text-left font-medium px-3 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-zinc-500">
                  <ShoppingCart className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  No orders yet. Orders from the storefront will appear here.
                </td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{o.customerName || '—'}</div>
                    <div className="text-xs text-zinc-500">{o.customerEmail}</div>
                  </td>
                  <td className="px-3 py-2.5 font-medium">{o.currency} {o.total}</td>
                  <td className="px-3 py-2.5">
                    <Select value={o.paymentStatus} onValueChange={(v) => updateStatus(o.id, 'paymentStatus', v)}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select value={o.fulfillmentStatus} onValueChange={(v) => updateStatus(o.id, 'fulfillmentStatus', v)}>
                      <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Customers ───────────────────────────────────────────────────────────────
function AdminCustomers() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ leads: any[] }>('/api/leads?pageSize=100').then((r) => setLeads(r.leads || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-zinc-500">Shared customer database — same records as CRM and storefront.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Email</th>
                <th className="text-left font-medium px-3 py-2.5">Phone</th>
                <th className="text-left font-medium px-3 py-2.5">City</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium">{l.businessName}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.email || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.whatsapp || l.phone || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.city || '—'}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{l.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-3 py-2.5 tabular-nums">{l.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function AdminAnalytics() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { api<any>('/api/analytics').then(setData).catch(() => {}) }, [])
  if (!data) return <div className="p-8 text-zinc-500">Loading analytics…</div>
  const t = data.totals
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-zinc-500">Real platform metrics — no fabricated stats.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Leads', value: t.totalLeads, color: 'text-purple-600' },
          { label: 'Total Calls', value: t.totalCalls, color: 'text-cyan-600' },
          { label: 'Total Messages', value: t.totalMessages, color: 'text-emerald-600' },
          { label: 'Active Campaigns', value: t.activeCampaigns, color: 'text-blue-600' },
          { label: 'Calls Today', value: t.callsToday, color: 'text-amber-600' },
          { label: 'Messages Today', value: t.messagesToday, color: 'text-pink-600' },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-3">
            <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
            <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  )
}

// ─── Settings ────────────────────────────────────────────────────────────────
function AdminSettings() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">System configuration and integrations.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Integration Status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <HealthRow label="WhatsApp Cloud API" ok={false} note="Configure in CRM → Integrations" />
            <HealthRow label="Meta Conversions API" ok />
            <HealthRow label="Telephony (mock)" ok />
            <HealthRow label="Email/SMTP" ok={false} note="Not configured" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/crm"><Button variant="outline" size="sm" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" /> CRM Settings & Integrations
            </Button></Link>
            <Link href="/storefront"><Button variant="outline" size="sm" className="w-full justify-start">
              <Package className="w-4 h-4 mr-2" /> View Storefront
            </Button></Link>
            <Link href="/"><Button variant="outline" size="sm" className="w-full justify-start">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
