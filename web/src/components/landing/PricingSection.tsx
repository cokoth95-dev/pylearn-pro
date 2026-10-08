"use client"

import React, { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Prices = { monthly_amount_kes: number; full_course_amount_kes: number; full_course_regular_amount_kes: number; monthly_amount_usd: number; full_course_amount_usd: number; full_course_regular_amount_usd: number; payments_enabled: boolean }

export default function PricingSection() {
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD')
  const [prices, setPrices] = useState<Prices>({ monthly_amount_kes: 6500, full_course_amount_kes: 18500, full_course_regular_amount_kes: 35000, monthly_amount_usd: 49, full_course_amount_usd: 149, full_course_regular_amount_usd: 299, payments_enabled: false })

  useEffect(() => {
    const supabase = createClient()
    void supabase.from('payment_settings').select('monthly_amount_kes,full_course_amount_kes,full_course_regular_amount_kes,monthly_amount_usd,full_course_amount_usd,full_course_regular_amount_usd,payments_enabled').eq('id', true).maybeSingle().then(({ data }) => {
      if (data) setPrices(data as Prices)
    })
  }, [])

  const selectedMonthly = currency === 'KES' ? prices.monthly_amount_kes : prices.monthly_amount_usd
  const selectedFull = currency === 'KES' ? prices.full_course_amount_kes : prices.full_course_amount_usd
  const selectedRegular = currency === 'KES' ? prices.full_course_regular_amount_kes : prices.full_course_regular_amount_usd
  const money = (amount: number) => currency === 'KES' ? `KSh ${amount.toLocaleString('en-KE')}` : `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  const current = { month1: currency === 'KES' ? 'KSh 0' : '$0', fullCourse: money(selectedFull), fullCourseOriginal: money(selectedRegular), monthly: `${money(selectedMonthly)}/mo`, savings: selectedRegular > selectedFull ? `Save ${money(selectedRegular - selectedFull)} with the full-course bundle` : '' }

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Heading & Currency Switcher */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Transparent & Flexible Tuition
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Start With Free Lessons. <span className="text-emerald-400">Paid Plans Are Coming.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            {prices.payments_enabled ? 'Create an account and use M-Pesa Paybill to request paid access.' : 'Create an account and try the published free lessons. New payment requests are currently paused.'}
          </p>

          {/* Currency Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-white/10">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${currency === 'USD' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('KES')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${currency === 'KES' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              KES (KSh)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Card 1: Free Month 1 Foundations */}
          <div className="rounded-2xl glass-panel p-8 flex flex-col justify-between border border-white/10 hover:border-emerald-500/30 transition">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Month 1 Starter</div>
              <h3 className="text-2xl font-bold text-white">Foundations & Logic</h3>
              <p className="text-slate-400 text-xs mt-2">Zero commitment. Test the pedagogy and build your first project.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{current.month1}</span>
                <span className="text-xs text-slate-500">/ currently free</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Access to currently published free lessons
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> In-Browser Pyodide Code Sandbox
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Optional AI learning help
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> More projects will be added as lessons are prepared
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="mt-8 w-full py-3 px-4 text-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
            >
              Start Free (No Card Needed)
            </Link>
          </div>

          {/* Card 2: Complete 4-Month Bundle (Popular) */}
          <div className="rounded-2xl glass-panel p-8 flex flex-col justify-between border-2 border-emerald-400 relative glass-glow-emerald bg-gradient-to-b from-emerald-500/10 via-slate-900/60 to-slate-900/80">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-wide">
              Most Popular • Best Value
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Full 4-Month Academy</div>
              <h3 className="text-2xl font-bold text-white">Zero to Python Pro</h3>
              <p className="text-slate-400 text-xs mt-2">Complete 16-week transformation with all 4 milestone capstones.</p>
              
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{current.fullCourse}</span>
                {selectedRegular > selectedFull && <span className="text-sm line-through text-slate-500">{current.fullCourseOriginal}</span>}
              </div>
              {current.savings && <div className="text-[11px] text-emerald-400 font-medium mt-1">{current.savings}</div>}

              <ul className="mt-6 space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Planned: all 16 weeks and 4 modules
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Planned: four portfolio capstones
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Planned: verifiable graduation certificate
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Planned: LinkedIn certificate sharing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Trusted code grading is not available yet
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Payment methods have not been enabled
                </li>
              </ul>
            </div>

            {prices.payments_enabled ? <Link href="/register" className="mt-8 block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-xs font-bold text-slate-950">Create account to request payment</Link> : <button type="button" disabled className="mt-8 w-full rounded-xl bg-stone-500/30 px-4 py-3 text-xs font-bold text-slate-300">Payments currently paused</button>}
          </div>

          {/* Card 3: Monthly Installment Plan */}
          <div className="rounded-2xl glass-panel p-8 flex flex-col justify-between border border-white/10 hover:border-cyan-500/30 transition">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">Pay-As-You-Go</div>
              <h3 className="text-2xl font-bold text-white">Monthly Subscription</h3>
              <p className="text-slate-400 text-xs mt-2">Pay month by month with manual M-Pesa confirmation.</p>
              
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{current.monthly}</span>
                <span className="text-xs text-slate-500">/ billed monthly</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Unlock modules month by month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Assignment grading is being prepared
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Graduation certificate is planned
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> No long-term lock-in
                </li>
              </ul>
            </div>

            {prices.payments_enabled ? <Link href="/register" className="mt-8 block w-full rounded-xl bg-white/10 px-4 py-3 text-center text-xs font-semibold text-white">Create account to request payment</Link> : <button type="button" disabled className="mt-8 w-full rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold text-slate-400">Payments currently paused</button>}
          </div>
        </div>

        {/* Security & Guarantee Trust Bar */}
        <div className="mt-12 text-center flex items-center justify-center gap-6 text-xs text-slate-400">
          <span>Paybill requests are manually reviewed by an administrator before course access is added.</span>
        </div>
      </div>
    </section>
  )
}
