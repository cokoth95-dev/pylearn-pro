"use client"

import React, { useState } from 'react'
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

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'foundations' | 'data' | 'oop' | 'ai'>('all')
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const prices = {
    USD: {
      m1: "$0",
      full: "$149",
      fullOriginal: "$299",
      monthly: "$49",
      discount: "Save $48 with full 4-month bundle"
    },
    KES: {
      m1: "KSh 0",
      full: "KSh 18,500",
      fullOriginal: "KSh 35,000",
      monthly: "KSh 6,500",
      discount: "Save KSh 7,500 with full upfront bundle"
    }
  }

  const cur = prices[currency]

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
      a: "When you register, Month 1 (Weeks 1 to 4) is completely free forever. You get access to the interactive IDE, video illustrations, flashcards, automated test cases, and your first capstone project with zero credit card required."
    },
    {
      q: "What payment methods are supported for unlocking Months 2 through 4?",
      a: "We support Credit/Debit Cards (Stripe), MPesa / Mobile Money, PayPal, and direct bank transfers with instant verification."
    },
    {
      q: "What happens if my code gets stuck on an assignment?",
      a: "Our integrated Google Gemini 3.6 Flash AI Tutor inspects your code, identifies your exact mistake, and offers gentle Socratic hints using everyday analogies without spoiling the answer."
    },
    {
      q: "Will I receive a verified certificate upon graduation?",
      a: "Yes! When you complete all 16 weeks and pass all 4 Capstone projects, you receive a verifiable digital PDF certificate with an embedded QR code and 1-click LinkedIn export."
    }
  ]

  const filteredModules = activeCategory === 'all' ? modules : modules.filter(m => m.category === activeCategory)

  return (
    <div className="min-h-screen bg-[#111318] text-[#f0f6fc]">
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
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
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
                {['all', 'foundations', 'data', 'oop', 'ai'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat as any)}
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
              Each week unlocks automatically only when you pass the automated test cases and capstone assignment.
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
                    <span className="text-slate-400">Capstone:</span>
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
              Month 1 is 100% Free with zero credit card required. Upgrade only when you are ready to unlock Months 2 through 4.
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
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Full Month 1 Classroom Access</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> In-Browser Pyodide Code Sandbox</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Google Gemini AI Socratic Tutoring</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Capstone 1: Budget Auditor</li>
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
                <p className="text-xs text-slate-400 mt-2">Complete 16-week transformation with all 4 milestone capstones.</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{cur.full}</span>
                  <span className="text-sm line-through text-slate-500">{cur.fullOriginal}</span>
                </div>
                <div className="text-[11px] text-amber-300 font-semibold mt-1">{cur.discount}</div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> All 16 Weeks & 4 Modules Unlocked</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> 4 Production Portfolio Capstones</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Verified QR Digital PDF Certificate</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> 1-Click Add to LinkedIn</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 py-3.5 px-4 text-center rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition"
              >
                Enroll Full Academy <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Monthly Subscription */}
            <div className="rounded-3xl glass-card p-8 flex flex-col justify-between border border-white/10">
              <div>
                <span className="text-xs font-extrabold uppercase text-sky-400">Pay-As-You-Go</span>
                <h3 className="text-2xl font-black text-white mt-1">Monthly Subscription</h3>
                <p className="text-xs text-slate-400 mt-2">Flexible month-by-month payments. Cancel or pause anytime.</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{cur.monthly}</span>
                  <span className="text-xs text-slate-500">/ billed monthly</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> Unlock modules month by month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> Full access to assignments & AI</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> No long-term lock-in</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 py-3.5 px-4 text-center rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
              >
                Choose Monthly Plan
              </Link>
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
            Built with Next.js, Pyodide Wasm, Supabase & Google Gemini AI.
          </div>
        </div>
      </footer>
    </div>
  )
}
