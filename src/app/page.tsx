'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingBag, Phone, MessageCircle, Users, BarChart3, PhoneCall,
  CheckSquare, Megaphone, ArrowRight, Zap, Shield, Globe
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useConsole } from '@/lib/console-store'

export default function LandingPage() {
  const { user } = useConsole()
  const [stats, setStats] = useState({ products: 0, categories: 0 })

  useEffect(() => {
    api<{ products: any[] }>('/api/products?limit=500').then((r) => {
      setStats((s) => ({ ...s, products: r.products?.length || 0 }))
    }).catch(() => {})
    api<{ categories: any[] }>('/api/categories').then((r) => {
      setStats((s) => ({ ...s, categories: r.categories?.length || 0 }))
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg pb-gradient-purple flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-lg leading-none">PlayBeat Digital</div>
              <div className="text-[10px] text-zinc-500">Premium Digital Marketplace</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/storefront" className="text-zinc-600 hover:text-purple-600">Storefront</Link>
            <Link href="/crm" className="text-zinc-600 hover:text-purple-600">CRM</Link>
            <Link href="/admin" className="text-zinc-600 hover:text-purple-600">Admin</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/crm">
                <Button size="sm" className="pb-gradient-purple text-white border-0">Open CRM</Button>
              </Link>
            ) : (
              <Link href="/crm">
                <Button size="sm" variant="outline">Sign in</Button>
              </Link>
            )}
            <Link href="/storefront">
              <Button size="sm" className="pb-gradient-purple text-white border-0">
                <ShoppingBag className="w-4 h-4 mr-1.5" /> Shop
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pb-gradient-charcoal text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30">
            <Zap className="w-3 h-3 mr-1" /> One Platform. Three Applications.
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            PlayBeat Digital
          </h1>
          <p className="text-lg md:text-xl text-purple-200/80 max-w-2xl mx-auto">
            A unified commerce + communication platform. Sell digital products, manage customer conversations, and control your entire business from one workspace.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/storefront">
              <Button size="lg" className="pb-gradient-purple text-white border-0 hover:opacity-90">
                <ShoppingBag className="w-5 h-5 mr-2" /> Visit Storefront
                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{stats.products} products</span>
              </Button>
            </Link>
            <Link href="/crm">
              <Button size="lg" variant="outline" className="border-purple-500/50 text-white hover:bg-purple-900/30">
                <PhoneCall className="w-5 h-5 mr-2" /> Open CRM
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="border-purple-500/50 text-white hover:bg-purple-900/30">
                <BarChart3 className="w-5 h-5 mr-2" /> Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three Apps */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Three Applications. One Backend.</h2>
          <p className="text-zinc-500">Shared database, shared API, shared customers — no silos.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Storefront */}
          <Link href="/storefront">
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer border-purple-100 hover:border-purple-300">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Storefront</h3>
                  <p className="text-sm text-zinc-500">/storefront</p>
                </div>
                <p className="text-sm text-zinc-600">
                  Digital marketplace with {stats.products} products across {stats.categories} categories. Streaming, subscriptions, gift cards, gaming, software, and smart projectors. Cart, checkout, instant digital delivery.
                </p>
                <div className="flex items-center gap-1 text-purple-600 text-sm font-medium">
                  Browse catalog <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* CRM */}
          <Link href="/crm">
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer border-purple-100 hover:border-purple-300">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <PhoneCall className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">CRM</h3>
                  <p className="text-sm text-zinc-500">/crm</p>
                </div>
                <p className="text-sm text-zinc-600">
                  Employee communication center. WhatsApp Business Cloud API, phone dialer, call management, lead tracking, tasks, follow-ups, customer timelines, Meta CAPI integration.
                </p>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  Open workspace <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Admin */}
          <Link href="/admin">
            <Card className="h-full hover:shadow-xl transition-all cursor-pointer border-purple-100 hover:border-purple-300">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Admin</h3>
                  <p className="text-sm text-zinc-500">/admin</p>
                </div>
                <p className="text-sm text-zinc-600">
                  Super Admin control center. Manage products, orders, customers, licenses, payments, employees, campaigns, analytics, and system settings — all connected to the same backend.
                </p>
                <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                  Manage platform <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Unified Architecture</h2>
            <p className="text-zinc-500">Every customer interaction flows through one shared backend</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Feature icon={MessageCircle} title="WhatsApp" desc="Official Cloud API with webhook signature verification" color="text-emerald-600" />
            <Feature icon={Phone} title="Phone Dialer" desc="Browser-based dialer with Twilio/Vonage adapter" color="text-purple-600" />
            <Feature icon={Megaphone} title="Meta CAPI" desc="Fire all 17 standard events for ad attribution" color="text-blue-600" />
            <Feature icon={Shield} title="RBAC" desc="Customer, Employee, Manager, Super Admin roles" color="text-red-600" />
            <Feature icon={Users} title="Shared CRM" desc="Customers sync across storefront, CRM, and admin" color="text-amber-600" />
            <Feature icon={CheckSquare} title="Tasks & Follow-ups" desc="Action items tied to customer records" color="text-cyan-600" />
            <Feature icon={Globe} title="Real-time" desc="Socket.IO for live messages, calls, notifications" color="text-indigo-600" />
            <Feature icon={BarChart3} title="Analytics" desc="Real data only — no fabricated stats" color="text-pink-600" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="w-6 h-6 rounded pb-gradient-purple flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 5l2-2h4l1 4-2 2c1 3 3 5 6 6l2-2 4 1v4l-2 2c-11 0-17-6-17-17z"/>
              </svg>
            </div>
            PlayBeat Digital — One workspace. Every customer conversation.
          </div>
          <div className="flex gap-4 text-sm text-zinc-500">
            <Link href="/storefront" className="hover:text-purple-600">Storefront</Link>
            <Link href="/crm" className="hover:text-purple-600">CRM</Link>
            <Link href="/admin" className="hover:text-purple-600">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, desc, color }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-zinc-500">{desc}</div>
      </CardContent>
    </Card>
  )
}
