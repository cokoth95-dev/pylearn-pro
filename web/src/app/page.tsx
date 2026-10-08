"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Award,
  Zap,
  Lock,
  ChevronDown,
  Laptop,
  CheckCircle2
} from 'lucide-react'
import HeroPlayground from '@/components/landing/HeroPlayground'
import { HeroVisualCapsules } from '@/components/landing/HeroVisualCapsules'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

type PricingSettings = {
  monthly_amount_kes: number
  full_course_amount_kes: number
  full_course_regular_amount_kes: number
  monthly_amount_usd: number
  full_course_amount_usd: number
  full_course_regular_amount_usd: number
  payments_enabled: boolean
  monthly_payments_enabled: boolean
  full_course_payments_enabled: boolean
  usd_kes_rate: number | null
  usd_kes_rate_date: string | null
}

export default function HomePage() {
  const [heroImage, setHeroImage] = useState<{ url: string | null; opacity: number }>({ url: null, opacity: 28 })
  const [pricing, setPricing] = useState<PricingSettings>({ monthly_amount_kes: 6500, full_course_amount_kes: 18500, full_course_regular_amount_kes: 35000, monthly_amount_usd: 49, full_course_amount_usd: 149, full_course_regular_amount_usd: 299, payments_enabled: false, monthly_payments_enabled: false, full_course_payments_enabled: false, usd_kes_rate: null, usd_kes_rate_date: null })
  const [activeCategory, setActiveCategory] = useState<'all' | 'foundations' | 'data' | 'oop' | 'ai'>('all')
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const money = (amount: number, selectedCurrency: 'USD' | 'KES') => selectedCurrency === 'KES'
    ? `KSh ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
    : `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  const salePrice = currency === 'KES' ? pricing.full_course_amount_kes : pricing.full_course_amount_usd
  const regularPrice = currency === 'KES' ? pricing.full_course_regular_amount_kes : pricing.full_course_regular_amount_usd
  const saving = Math.max(0, regularPrice - salePrice)
  const cur = {
    m1: currency === 'KES' ? 'KSh 0' : '$0',
    full: money(salePrice, currency),
    fullOriginal: money(regularPrice, currency),
    monthly: money(currency === 'KES' ? pricing.monthly_amount_kes : pricing.monthly_amount_usd, currency),
    discount: saving > 0 ? `Save ${money(saving, currency)} with the full-course bundle` : '',
  }

  useEffect(() => {
    const supabase = createClient()
    void supabase.from('site_settings').select('hero_image_url,hero_image_opacity').eq('id', 'main').maybeSingle().then(({ data }) => {
      if (data) setHeroImage({ url: data.hero_image_url, opacity: data.hero_image_opacity })
    })
    void supabase.from('payment_settings').select('payments_enabled,monthly_payments_enabled,full_course_payments_enabled,monthly_amount_kes,full_course_amount_kes,full_course_regular_amount_kes,monthly_amount_usd,full_course_amount_usd,full_course_regular_amount_usd,usd_kes_rate,usd_kes_rate_date').eq('id', true).maybeSingle().then(({ data }) => {
      if (data) setPricing(data as PricingSettings)
    })
  }, [])

  const modules = [
    {
      month: 1,
      tag: "Weeks 1–4",
      category: "foundations",
      title: "Foundations & Pure Logic",
      analogy: "Storage jars, road crossroads, and repeating clocks",
      skills: ["Variables as Labeled Storage", "Input/Output with f-strings", "If / Elif / Else Branching", "While & For Loop Iterations", "Bug Slayer Debugging"],
      capstone: "Automated Personal Budget & Expense Auditor",
      isFree: true
    },
    {
      month: 2,
      tag: "Weeks 5–8",
      category: "data",
      title: "Data Structures & Automation",
      analogy: "Shopping carts, telephone directories, and office filing cabinets",
      skills: ["Lists, Tuples & Matrix Slicing", "Dictionaries & Key-Value Lookup", "File I/O (CSV & TXT Processing)", "Custom Exception Handling", "List Comprehensions"],
      capstone: "Smart File Organizer & Automated Excel Report Generator",
      isFree: false
    },
    {
      month: 3,
      tag: "Weeks 9–12",
      category: "oop",
      title: "OOP, Web APIs & Microservices",
      analogy: "Architectural blueprints, restaurant menus, and kitchen orders",
      skills: ["Functions & Scope Architecture", "Classes, Methods & Inheritance", "HTTP Requests & REST APIs", "JSON Data Serialization", "Modular Package Design"],
      capstone: "Live Financial Stock & Weather Multi-City Dashboard",
      isFree: false
    },
    {
      month: 4,
      tag: "Weeks 13–16",
      category: "ai",
      title: "Data Science, AI & Web Engineering",
      analogy: "Spreadsheet crunching and AI brain pattern recognition",
      skills: ["NumPy & Pandas Data Wrangling", "Google Gemini AI SDK Integration", "Building Web Interfaces (FastAPI/Streamlit)", "Production Cloud Deployment", "Portfolio Packaging"],
      capstone: "Full-Stack AI Data Analyst Web Application",
      isFree: false
    }
  ]

  const faqs = [
    {
      q: "I have zero programming or math background. Can I really learn Python here?",
      a: "Yes, 100%! PyLearn Pro is engineered specifically for complete beginners. Every concept is explained through physical things you touch every day—like kitchen pantry jars, recipes, shopping carts, and telephone books."
    },
    {
      q: "Do I need to install Python, VS Code, or terminal tools on my computer?",
      a: "Not at all! Our in-browser Code Studio runs full Python 3.12 WebAssembly (Pyodide) directly inside your web browser without installing anything."
    },
    {
      q: "How does Month 1 Free access work?",
      a: "The first Python lessons are free to try, and no payment details are needed to create an account. The course currently saves lesson progress and quick-check results. Capstones and flashcard tools are still being prepared."
    },
    {
      q: "What payment methods are supported for unlocking Months 2 through 4?",
      a: "Paid course payments open only when the relevant paid lessons are published. The Payments page shows which options are currently available."
    },
    {
      q: "What happens if my code gets stuck on an assignment?",
      a: "You can ask the AI mentor for help when you want it. It gives beginner-friendly explanations and hints."
    },
    {
      q: "Will I receive a verified certificate upon graduation?",
      a: "Certificates are planned, but the app does not issue graduation certificates yet. We will share the requirements before certificate awards are enabled."
    }
  ]

  const filteredModules = activeCategory === 'all' ? modules : modules.filter(m => m.category === activeCategory)

  return (
    <div className="landing-page min-h-screen bg-[#111318] text-stone-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#111318]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-300 p-[2px] shadow-lg shadow-amber-400/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#111318] rounded-2xl flex items-center justify-center text-xl">
                🐍
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                PyLearn <span className="text-amber-400">Pro</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium block -mt-1">Modern Python & AI Academy</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#curriculum" className="hover:text-amber-400 transition">Curriculum</a>
            <a href="#playground" className="hover:text-amber-400 transition">Live Sandbox</a>
            <a href="#pricing" className="hover:text-amber-400 transition">Fee Structure</a>
            <a href="#faq" className="hover:text-amber-400 transition">FAQs</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-5 py-2.5 text-xs font-bold text-slate-200 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition"
            >
              Start Free Today →
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-24 px-6 overflow-hidden border-b border-white/5">
        {heroImage.url && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${heroImage.url}")`, opacity: heroImage.opacity / 100 }} />}
        {heroImage.url && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#111318]/65" />}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-amber-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Zero-Experience Python Online Academy</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Your Modern <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
                Python Online School
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Master Python in 4 months through intuitive everyday surroundings, live in-browser coding, and 24/7 Google Gemini AI mentoring.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/register"
                className="px-8 py-4 text-sm font-extrabold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-2xl shadow-xl shadow-sky-400/25 flex items-center gap-2 transition"
              >
                Start Today (Free) <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="px-8 py-4 text-sm font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition"
              >
                Registration
              </Link>
            </div>

            {/* Category Selector */}
            <div className="pt-8 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Choose Your Pathway
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {(['all', 'foundations', 'data', 'oop', 'ai'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl transition cursor-pointer capitalize ${
                      activeCategory === cat
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {cat === 'all' ? 'All 4 Months' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Capsules */}
          <div className="lg:col-span-6">
            <HeroVisualCapsules />
          </div>
        </div>
      </section>

      {/* LIVE IN-BROWSER SANDBOX */}
      <section id="playground" className="py-20 px-6 bg-[#161b22]/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Laptop className="w-4 h-4 text-amber-400" /> Interactive Browser Sandbox
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Try Writing Python <span className="text-amber-400">Right Now</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              No download or setup required. Edit the code below and hit <strong>Run Code</strong>!
            </p>
          </div>

          <HeroPlayground />
        </div>
      </section>

      {/* 4-MONTH MILESTONE ROADMAP */}
      <section id="curriculum" className="py-20 px-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-400/10 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-3">
              <BookOpen className="w-4 h-4 text-sky-400" /> 16-Week Structured Syllabus
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              The 4-Month <span className="text-sky-400">Milestone-Gated Roadmap</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              This is the planned four-month pathway. Only lessons that have been published are available; weekly capstone assessment is still being prepared.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredModules.map((m) => (
              <div
                key={m.month}
                className="rounded-3xl p-7 glass-card border border-white/10 hover:border-white/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Month {m.month} • {m.tag}
                    </span>
                    {m.isFree ? (
                      <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                        100% Free
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5" /> Milestone Gated
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-white mb-2">{m.title}</h3>

                  <div className="p-3.5 rounded-2xl bg-[#0d1117] border border-white/5 text-xs text-amber-200/90 mb-5 flex items-start gap-2">
                    <span className="text-base">🏠</span>
                    <div>
                      <strong className="text-amber-300">Surroundings Model:</strong> {m.analogy}
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills Mastered:</div>
                    <div className="space-y-1.5 text-xs text-slate-200">
                      {m.skills.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-400">Planned project:</span>
                    <strong className="text-white">{m.capstone}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6 bg-[#161b22]/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Zap className="w-4 h-4 text-emerald-400" /> Transparent Tuition Structure
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Start Free Today. <span className="text-amber-400">Pay As You Master.</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Month 1 is free. {pricing.payments_enabled && (pricing.monthly_payments_enabled || pricing.full_course_payments_enabled) ? 'Available paid plans can be paid by M-Pesa Paybill after creating your learner account.' : 'Paid plans are currently unavailable while paid lessons are being prepared.'}
            </p>

            <div className="mt-8 inline-flex items-center p-1 rounded-2xl bg-[#0d1117] border border-white/10">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  currency === 'USD' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('KES')}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  currency === 'KES' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                KES (KSh)
              </button>
            </div>
            {currency === 'USD' && <p className="mt-2 text-xs text-slate-500">USD is a display estimate from the CBK indicative rate{pricing.usd_kes_rate_date ? ` dated ${pricing.usd_kes_rate_date}` : ''}. Paybill charges are collected in KSh.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Month 1 */}
            <div className="rounded-3xl glass-card p-8 flex flex-col justify-between border border-white/10">
              <div>
                <span className="text-xs font-extrabold uppercase text-amber-400">Month 1 Starter</span>
                <h3 className="text-2xl font-black text-white mt-1">Foundations & Logic</h3>
                <p className="text-xs text-slate-400 mt-2">Zero commitment. Test our pedagogy and build your first budget project.</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{cur.m1}</span>
                  <span className="text-xs text-slate-500">/ forever free</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Access to published Month 1 lessons</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> In-Browser Pyodide Code Sandbox</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Google Gemini AI Socratic Tutoring</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Quick checks and saved lesson progress</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 py-3.5 px-4 text-center rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
              >
                Start Free (No Card Needed)
              </Link>
            </div>

            {/* Complete 4-Month Academy */}
            <div className="rounded-3xl glass-card p-8 flex flex-col justify-between border-2 border-amber-400 relative bg-gradient-to-b from-amber-400/10 via-[#161b22] to-[#161b22] shadow-2xl shadow-amber-400/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider">
                Most Popular • Best Value
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase text-amber-400">Full 4-Month Academy</span>
                <h3 className="text-2xl font-black text-white mt-1">Zero to Python Pro</h3>
                <p className="text-xs text-slate-400 mt-2">Complete the four-month course and its published learning modules.</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{cur.full}</span>
                  {regularPrice > salePrice && <span className="text-sm line-through text-slate-500">{cur.fullOriginal}</span>}
                </div>
                {cur.discount && <div className="text-[11px] text-amber-300 font-semibold mt-1">{cur.discount}</div>}
                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Access to all published paid modules</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> New course lessons appear as they are published</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Browser-based coding practice and quick checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Optional AI help while learning</li>
                </ul>
              </div>
              {pricing.payments_enabled && pricing.full_course_payments_enabled ? <Link href="/register" className="mt-8 py-3.5 px-4 text-center rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition">Enroll Full Academy <ArrowRight className="w-4 h-4"/></Link> : <p className="mt-8 rounded-2xl bg-white/10 p-3 text-center text-xs font-semibold text-slate-300">Full-course payments open after all paid months are published.</p>}
            </div>

            {/* Monthly Subscription */}
            <div className="rounded-3xl glass-card p-8 flex flex-col justify-between border border-white/10">
              <div>
                <span className="text-xs font-extrabold uppercase text-sky-400">Pay-As-You-Go</span>
                <h3 className="text-2xl font-black text-white mt-1">Monthly Subscription</h3>
                <p className="text-xs text-slate-400 mt-2">One month of access for 30 days after admin confirms your M-Pesa payment.</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{cur.monthly}</span>
                  <span className="text-xs text-slate-500">/ billed monthly</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> Unlock the next paid course month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> Browser-based coding practice and quick checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> No automatic recurring charge</li>
                </ul>
              </div>
              {pricing.payments_enabled && pricing.monthly_payments_enabled ? <Link href="/register" className="mt-8 py-3.5 px-4 text-center rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition">Choose Monthly Plan</Link> : <p className="mt-8 rounded-2xl bg-white/10 p-3 text-center text-xs font-semibold text-slate-300">Monthly payments open when the next paid month is published.</p>}
            </div>
          </div>
        </div>
      </section>

      {/* FAQS */}
      <section id="faq" className="py-20 px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-sm mt-2">Everything you need to know about the 4-month program.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="rounded-2xl glass-card border border-white/10 overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition cursor-pointer"
                  >
                    <span className="font-bold text-white text-sm">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-4">
                      {f.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐍</span>
            <span className="font-bold text-slate-300">PyLearn Pro</span>
            <span>— The 4-Month Python & AI Online School.</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <span>Built with Next.js, Pyodide Wasm, Supabase & Google Gemini AI.</span>
              <Link className="underline hover:text-slate-300" href="/terms">Terms</Link>
              <Link className="underline hover:text-slate-300" href="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
