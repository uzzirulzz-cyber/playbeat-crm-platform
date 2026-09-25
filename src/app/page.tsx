'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wordmark, TrustStrip, CookieBanner, Header, formatPrice } from '@/components/pb/brand'
import { ShoppingBag, PhoneCall, BarChart3, ArrowRight, Zap, Shield, Globe, MessageCircle, Phone, Megaphone, Users, CheckSquare, Star } from 'lucide-react'
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
      <Header activeRoute="home" />

      {/* Hero */}
      <section className="pb-gradient-charcoal text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3 h-3" /> One Platform. Three Applications.
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            PlayBeat Digital
          </h1>
          <p className="text-lg md:text-xl text-silver max-w-2xl mx-auto">
            Pakistan's premium digital marketplace. Streaming, subscriptions, gift cards, gaming, software, and smart projectors — delivered instantly.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/storefront">
              <button className="pb-cta-gold text-base px-8 py-3 rounded-md inline-flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Visit Storefront
                <span className="ml-2 text-xs bg-navy/20 px-2 py-0.5 rounded-full">{stats.products} products</span>
              </button>
            </Link>
            <Link href="/crm">
              <Button size="lg" variant="outline" className="border-silver/30 text-white hover:bg-silver/10 bg-transparent">
                <PhoneCall className="w-5 h-5 mr-2" /> Open CRM
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="border-silver/30 text-white hover:bg-silver/10 bg-transparent">
                <BarChart3 className="w-5 h-5 mr-2" /> Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip — directly under hero (moved from footer) */}
      <TrustStrip />

      {/* Three Apps */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2 text-navy">Three Applications. One Backend.</h2>
          <p className="text-slate-500">Shared database, shared API, shared customers — no silos.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Storefront */}
          <Link href="/storefront" className="block">
            <div className="pb-card p-6 h-full hover:shadow-card-hover transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-cloud flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-navy" />
              </div>
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-navy">Storefront</h3>
                <p className="text-sm text-slate-500 font-mono">/storefront</p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Digital marketplace with {stats.products} products across {stats.categories} categories. Streaming, subscriptions, gift cards, gaming, software, and smart projectors. Cart, checkout, instant digital delivery.
              </p>
              <div className="flex items-center gap-1 text-navy text-sm font-semibold">
                Browse catalog <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* CRM */}
          <Link href="/crm" className="block">
            <div className="pb-card p-6 h-full hover:shadow-card-hover transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-cloud flex items-center justify-center mb-4">
                <PhoneCall className="w-6 h-6 text-navy" />
              </div>
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-navy">CRM</h3>
                <p className="text-sm text-slate-500 font-mono">/crm</p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Employee communication center. WhatsApp Business Cloud API, phone dialer, call management, lead tracking, tasks, follow-ups, customer timelines, Meta CAPI integration.
              </p>
              <div className="flex items-center gap-1 text-navy text-sm font-semibold">
                Open workspace <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Admin */}
          <Link href="/admin" className="block">
            <div className="pb-card p-6 h-full hover:shadow-card-hover transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-lg bg-cloud flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-navy" />
              </div>
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-navy">Admin</h3>
                <p className="text-sm text-slate-500 font-mono">/admin</p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Super Admin control center. Manage products, orders, customers, licenses, payments, employees, campaigns, analytics, and system settings — all connected to the same backend.
              </p>
              <div className="flex items-center gap-1 text-navy text-sm font-semibold">
                Manage platform <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-cloud">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2 text-navy">Unified Architecture</h2>
            <p className="text-slate-500">Every customer interaction flows through one shared backend</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Feature icon={MessageCircle} title="WhatsApp" desc="Official Cloud API with webhook signature verification" />
            <Feature icon={Phone} title="Phone Dialer" desc="Browser-based dialer with Twilio/Vonage adapter" />
            <Feature icon={Megaphone} title="Meta CAPI" desc="Fire all 17 standard events for ad attribution" />
            <Feature icon={Shield} title="RBAC" desc="Customer, Employee, Manager, Super Admin roles" />
            <Feature icon={Users} title="Shared CRM" desc="Customers sync across storefront, CRM, and admin" />
            <Feature icon={CheckSquare} title="Tasks & Follow-ups" desc="Action items tied to customer records" />
            <Feature icon={Globe} title="Real-time" desc="Socket.IO for live messages, calls, notifications" />
            <Feature icon={BarChart3} title="Analytics" desc="Real data only — no fabricated stats" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wordmark size="sm" />
            <span className="text-slate-400">— One workspace. Every customer conversation.</span>
          </div>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/storefront" className="hover:text-navy">Storefront</Link>
            <Link href="/crm" className="hover:text-navy">CRM</Link>
            <Link href="/admin" className="hover:text-navy">Admin</Link>
          </div>
        </div>
      </footer>

      {/* Cookie banner — compact bottom-left 320px */}
      <CookieBanner />
    </div>
  )
}

function Feature({ icon: Icon, title, desc }: any) {
  return (
    <div className="pb-card p-4">
      <Icon className="w-5 h-5 text-navy mb-2" />
      <div className="font-medium text-sm text-navy">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </div>
  )
}
