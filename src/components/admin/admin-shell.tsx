'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard, Package, ShoppingBag, Users, Key, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Store, MessageSquare, Phone, TrendingUp,
  DollarSign, ShoppingCart, AlertCircle, Plus, Edit, Trash2, CheckCircle, X,
} from 'lucide-react'
import { useConsole } from '@/lib/console-store'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

type AdminView = 'dashboard' | 'products' | 'orders' | 'customers' | 'licenses' | 'analytics' | 'settings'

const NAV: { key: AdminView; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'licenses', label: 'License Vault', icon: Key },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const PIE_COLORS = ['#6d28d9', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899']

export default function AdminShell() {
  const { user, setAppMode, logout, setUser } = useConsole()
  const [view, setView] = useState<AdminView>('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  async function doLogout() {
    try { await api('/api/auth/login', { method: 'DELETE' }) } catch {}
    logout()
    setUser(null)
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50">
      {/* Sidebar */}
      <aside className={cn('hidden md:flex flex-col pb-gradient-charcoal text-zinc-200 border-r border-purple-900/30 transition-all', collapsed ? 'w-16' : 'w-56')}>
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-purple-900/30">
          <div className="w-8 h-8 rounded-lg pb-gradient-purple flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white">PlayBeat Admin</span>
              <span className="text-[10px] text-purple-300/80 -mt-0.5">Control Center</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scroll">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = view === n.key
            return (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                title={collapsed ? n.label : undefined}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active ? 'bg-purple-600/30 text-white ring-1 ring-purple-500/40' : 'text-zinc-300 hover:bg-purple-900/20 hover:text-white',
                  collapsed && 'justify-center')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* App switcher */}
        <div className="border-t border-purple-900/30 p-2 space-y-1">
          <button
            onClick={() => setAppMode('storefront')}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-purple-900/20 hover:text-white transition-colors',
              collapsed && 'justify-center')}
          >
            <Store className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Storefront</span>}
          </button>
          <button
            onClick={() => setAppMode('crm')}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-purple-900/20 hover:text-white transition-colors',
              collapsed && 'justify-center')}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            {!collapsed && <span>CRM</span>}
          </button>
          <button
            onClick={doLogout}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-red-300 hover:bg-red-900/20 transition-colors',
              collapsed && 'justify-center')}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <h1 className="font-semibold capitalize">{view}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">Super Admin</Badge>
            <div className="w-8 h-8 rounded-full pb-gradient-purple flex items-center justify-center text-xs font-semibold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto custom-scroll">
          {view === 'dashboard' && <AdminDashboard />}
          {view === 'products' && <AdminProducts />}
          {view === 'orders' && <AdminOrders />}
          {view === 'customers' && <AdminCustomers />}
          {view === 'licenses' && <AdminLicenses />}
          {view === 'analytics' && <AdminAnalytics />}
          {view === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api<any>('/api/analytics').catch(() => null),
      api<{ products: any[] }>('/api/products').catch(() => ({ products: [] })),
      api<{ orders: any[] }>('/api/orders').catch(() => ({ orders: [] })),
    ]).then(([a, p, o]) => {
      setStats({
        analytics: a,
        products: p?.products || [],
        orders: o?.orders || [],
      })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-zinc-500">Loading dashboard…</div>

  const totalProducts = stats.products.length
  const totalOrders = stats.orders.length
  const pendingOrders = stats.orders.filter((o: any) => o.paymentStatus === 'PENDING').length
  const paidOrders = stats.orders.filter((o: any) => o.paymentStatus === 'PAID').length
  const totalRevenue = stats.orders.filter((o: any) => o.paymentStatus === 'PAID').reduce((sum: number, o: any) => sum + o.total, 0)

  const cards = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-purple-600' },
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'text-blue-600' },
    { label: 'Pending Payment', value: pendingOrders, icon: AlertCircle, color: 'text-amber-600' },
    { label: 'Paid Orders', value: paidOrders, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Total Revenue', value: `PKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-600' },
    { label: 'Total Leads', value: stats.analytics?.totals?.totalLeads || 0, icon: Users, color: 'text-cyan-600' },
    { label: 'Calls Today', value: stats.analytics?.totals?.callsToday || 0, icon: Phone, color: 'text-purple-600' },
    { label: 'Messages Today', value: stats.analytics?.totals?.messagesToday || 0, icon: MessageSquare, color: 'text-emerald-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">{c.label}</span>
                  <Icon className={cn('w-3.5 h-3.5', c.color)} />
                </div>
                <div className="text-xl font-bold tabular-nums">{c.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            {stats.orders.length === 0 ? (
              <div className="text-center py-6 text-sm text-zinc-500">No orders yet.</div>
            ) : (
              <div className="space-y-2">
                {stats.orders.slice(0, 5).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium font-mono">{o.orderNumber}</div>
                      <div className="text-xs text-zinc-500">{o.customerName} • {new Date(o.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">PKR {o.total.toLocaleString()}</div>
                      <Badge variant="outline" className={cn('text-[10px]', o.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700')}>{o.paymentStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Products by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown(stats.products)} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryBreakdown(stats.products).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function categoryBreakdown(products: any[]) {
  const map: Record<string, number> = {}
  products.forEach((p) => { map[p.categoryName || 'Other'] = (map[p.categoryName || 'Other'] || 0) + 1 })
  return Object.entries(map).map(([label, value]) => ({ label, value }))
}

// ─── Products ───────────────────────────────────────────────────────────────
function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await api<{ products: any[] }>('/api/products')
      setProducts(r.products || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button size="sm" className="pb-gradient-purple border-0"><Plus className="w-4 h-4 mr-1.5" /> Add Product</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Category</th>
                <th className="text-left font-medium px-3 py-2.5">Type</th>
                <th className="text-right font-medium px-3 py-2.5">Price</th>
                <th className="text-right font-medium px-3 py-2.5">Stock</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium">{p.name}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{p.categoryName || '—'}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{p.type}</Badge></td>
                  <td className="px-3 py-2.5 text-right font-semibold">PKR {(p.salePrice || p.price).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.stock}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className={cn('text-xs', p.status === 'ACTIVE' ? 'text-emerald-700' : 'text-zinc-500')}>{p.status}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Orders ─────────────────────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filter) qs.set('paymentStatus', filter)
      const r = await api<{ orders: any[] }>(`/api/orders?${qs.toString()}`)
      setOrders(r.orders || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function markPaid(orderId: string) {
    try {
      await api('/api/payments', { method: 'POST', body: JSON.stringify({ orderId, status: 'PAID', method: 'MANUAL' }) })
      toast.success('Payment confirmed')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function fulfill(orderId: string) {
    try {
      await api(`/api/orders/${orderId}/fulfill`, { method: 'POST' })
      toast.success('Order fulfilled — licenses delivered')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
        {['', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium',
              filter === f ? 'pb-gradient-purple text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
          >
            {f || 'All'} ({f ? orders.filter(o => o.paymentStatus === f).length : orders.length})
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">Order #</th>
                <th className="text-left font-medium px-3 py-2.5">Customer</th>
                <th className="text-left font-medium px-3 py-2.5">Items</th>
                <th className="text-right font-medium px-3 py-2.5">Total</th>
                <th className="text-left font-medium px-3 py-2.5">Payment</th>
                <th className="text-left font-medium px-3 py-2.5">Fulfillment</th>
                <th className="text-left font-medium px-3 py-2.5">Date</th>
                <th className="text-right px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={8} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && orders.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-zinc-500">No orders yet.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{o.customerName || '—'}</div>
                    <div className="text-xs text-zinc-500">{o.customerPhone || o.customerEmail || ''}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-600">{(o.items || []).length} item(s)</td>
                  <td className="px-3 py-2.5 text-right font-semibold">PKR {o.total.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={cn('text-xs',
                      o.paymentStatus === 'PAID' ? 'text-emerald-700 border-emerald-300' :
                      o.paymentStatus === 'PENDING' ? 'text-amber-700 border-amber-300' :
                      'text-red-700 border-red-300')}>{o.paymentStatus}</Badge>
                  </td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{o.fulfillmentStatus}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {o.paymentStatus === 'PENDING' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(o.id)}>Mark Paid</Button>
                      )}
                      {o.paymentStatus === 'PAID' && o.fulfillmentStatus === 'NEW' && (
                        <Button size="sm" className="h-7 text-xs pb-gradient-purple border-0" onClick={() => fulfill(o.id)}>Fulfill</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Customers ──────────────────────────────────────────────────────────────
function AdminCustomers() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ leads: any[] }>('/api/leads?pageSize=100').then((r) => setLeads(r.leads || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-4">
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
                <th className="text-left font-medium px-3 py-2.5">Assigned</th>
                <th className="text-left font-medium px-3 py-2.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={7} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium">{l.businessName}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.email || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600 font-mono text-xs">{l.whatsapp || l.phone || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.city || '—'}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{l.status}</Badge></td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.assignedToName || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Licenses ───────────────────────────────────────────────────────────────
function AdminLicenses() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('AVAILABLE')

  async function load() {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filter) qs.set('status', filter)
      const r = await api<{ licenses: any[] }>(`/api/licenses?${qs.toString()}`)
      setLicenses(r.licenses || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['AVAILABLE', 'DELIVERED', 'RESERVED', 'EXPIRED', 'REVOKED', ''].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium',
                filter === f ? 'pb-gradient-purple text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
            >
              {f || 'All'}
            </button>
          ))}
        </div>
        <Button size="sm" className="pb-gradient-purple border-0"><Plus className="w-4 h-4 mr-1.5" /> Add License</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left font-medium px-3 py-2.5">License Key</th>
                <th className="text-left font-medium px-3 py-2.5">Product</th>
                <th className="text-left font-medium px-3 py-2.5">Supplier</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Order</th>
                <th className="text-left font-medium px-3 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Loading…</td></tr>}
              {!loading && licenses.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">No licenses found.</td></tr>}
              {licenses.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-mono text-xs">{l.licenseKey}</td>
                  <td className="px-3 py-2.5">{l.productName || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{l.supplier || '—'}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={cn('text-xs',
                      l.status === 'AVAILABLE' ? 'text-emerald-700 border-emerald-300' :
                      l.status === 'DELIVERED' ? 'text-blue-700 border-blue-300' :
                      'text-zinc-500')}>{l.status}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500 font-mono">{l.orderId ? l.orderId.slice(-8) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Analytics ──────────────────────────────────────────────────────────────
function AdminAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<any>('/api/analytics').then((r) => setData(r)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-zinc-500">Loading analytics…</div>
  if (!data) return null

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-zinc-500">Total Revenue</div><div className="text-xl font-bold">PKR 0</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-zinc-500">Orders</div><div className="text-xl font-bold">{data.totals.totalMessages || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-zinc-500">Conversion Rate</div><div className="text-xl font-bold">0%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-zinc-500">Active Products</div><div className="text-xl font-bold">48</div></CardContent></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Communication — 7 Days</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.messagesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#6d28d9" radius={[4,4,0,0]} />
                  <Bar dataKey="calls" fill="#06b6d4" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.charts.leadsByStatus} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                    {data.charts.leadsByStatus.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Settings ───────────────────────────────────────────────────────────────
function AdminSettings() {
  const { setAppMode } = useConsole()
  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Platform Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-md">
            <div>
              <div className="font-medium text-sm">Storefront</div>
              <div className="text-xs text-zinc-500">Public shopping marketplace</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAppMode('storefront')}>Open Storefront</Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-md">
            <div>
              <div className="font-medium text-sm">CRM</div>
              <div className="text-xs text-zinc-500">Employee communication center</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAppMode('crm')}>Open CRM</Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-md">
            <div>
              <div className="font-medium text-sm">Integrations</div>
              <div className="text-xs text-zinc-500">WhatsApp, Meta CAPI, Telephony, Email</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAppMode('crm')}>Configure</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">System Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Storefront</span><Badge className="bg-emerald-100 text-emerald-700">PASS</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">CRM</span><Badge className="bg-emerald-100 text-emerald-700">PASS</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">Admin</span><Badge className="bg-emerald-100 text-emerald-700">PASS</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">Authentication</span><Badge className="bg-emerald-100 text-emerald-700">PASS</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">Database</span><Badge className="bg-emerald-100 text-emerald-700">PASS</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">WhatsApp</span><Badge className="bg-emerald-100 text-emerald-700">CONNECTED</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">Meta CAPI</span><Badge className="bg-emerald-100 text-emerald-700">CONNECTED</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">Telephony</span><Badge className="bg-amber-100 text-amber-700">MOCK</Badge></div>
            <div className="flex justify-between"><span className="text-zinc-500">Payments</span><Badge className="bg-red-100 text-red-700">NOT CONFIGURED</Badge></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
