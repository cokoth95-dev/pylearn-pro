"use client"

import React, { useState } from 'react'
import { Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function PricingSection() {
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD')

  const prices = {
    USD: {
      month1: '$0',
      fullCourse: '$149',
      fullCourseOriginal: '$299',
      monthly: '$49/mo',
      savings: 'Save $48 with upfront full bundle'
    },
    KES: {
      month1: 'KSh 0',
      fullCourse: 'KSh 18,500',
      fullCourseOriginal: 'KSh 35,000',
      monthly: 'KSh 6,500/mo',
      savings: 'Save KSh 7,500 with full 4-month bundle'
    }
  }

  const current = prices[currency]

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Heading & Currency Switcher */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Transparent & Flexible Tuition
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Start Free Today. <span className="text-emerald-400">Pay As You Master.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            Month 1 is 100% free with zero credit card required. Upgrade only when you are ready to unlock Months 2 through 4.
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
                <span className="text-xs text-slate-500">/ forever free</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Full Month 1 Classroom Access (Weeks 1–4)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> In-Browser Pyodide Code Sandbox
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Google Gemini AI Socratic Hint Mentor
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Capstone 1: Budget & Expense Auditor
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
                <span className="text-sm line-through text-slate-500">{current.fullCourseOriginal}</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-medium mt-1">{current.savings}</div>

              <ul className="mt-6 space-y-3 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> All 16 Weeks & 4 Modules Unlocked
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 4 Production Portfolio Capstone Projects
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Automated QR-Verified Digital PDF Certificate
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 1-Click Add to LinkedIn Certification
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited Automated Gemini AI Code Reviews
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> MPesa, Stripe, PayPal & Bank Transfer
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="mt-8 w-full py-3 px-4 text-center rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
            >
              Enroll Full Academy <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Monthly Installment Plan */}
          <div className="rounded-2xl glass-panel p-8 flex flex-col justify-between border border-white/10 hover:border-cyan-500/30 transition">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">Pay-As-You-Go</div>
              <h3 className="text-2xl font-bold text-white">Monthly Subscription</h3>
              <p className="text-slate-400 text-xs mt-2">Flexible month-by-month payments. Cancel or pause anytime.</p>
              
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{current.monthly}</span>
                <span className="text-xs text-slate-500">/ billed monthly</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Unlock modules month by month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Full access to assignments & AI grading
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> Certificate awarded upon Month 4 completion
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" /> No long-term lock-in
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="mt-8 w-full py-3 px-4 text-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
            >
              Choose Monthly Plan
            </Link>
          </div>
        </div>

        {/* Security & Guarantee Trust Bar */}
        <div className="mt-12 text-center flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 14-Day Money-Back Guarantee
          </span>
          <span>•</span>
          <span>Instant Automated Activation</span>
          <span>•</span>
          <span>Secure Encrypted Checkout</span>
        </div>
      </div>
    </section>
  )
}
