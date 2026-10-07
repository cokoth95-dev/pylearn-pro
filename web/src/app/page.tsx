import React from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, ShieldCheck, Zap, Code2, GraduationCap, CheckCircle } from 'lucide-react'
import HeroPlayground from '@/components/landing/HeroPlayground'
import RoadmapSection from '@/components/landing/RoadmapSection'
import PricingSection from '@/components/landing/PricingSection'
import FAQSection from '@/components/landing/FAQSection'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090d16]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">🐍</span>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                PyLearn <span className="text-emerald-400">Pro</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-medium">4-Month Python & AI Academy</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
            <a href="#curriculum" className="hover:text-emerald-400 transition">Curriculum</a>
            <a href="#playground" className="hover:text-emerald-400 transition">Live Sandbox</a>
            <a href="#pricing" className="hover:text-emerald-400 transition">Fee Structure</a>
            <a href="#faq" className="hover:text-emerald-400 transition">FAQs</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Zero Experience Required • 100% In-Browser
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Master Python in 4 Months <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300">
              Through Everyday Surroundings.
            </span>
          </h1>

          <p className="mt-6 text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            No jargon. No scary math. Learn variables as labeled jars, loops as repeating clocks, and OOP as architectural blueprints—backed by 24/7 Google Gemini AI tutoring.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition cursor-pointer"
            >
              Start Free Month 1 Now <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#curriculum"
              className="px-6 py-4 text-sm font-semibold text-slate-200 glass-panel hover:bg-white/10 rounded-xl transition"
            >
              Explore 4-Month Roadmap
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Month 1 is 100% Free</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> No Credit Card Required</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Instant Access</span>
          </div>

          {/* Interactive Live Playground Demo */}
          <div id="playground" className="mt-16 text-left">
            <div className="text-center mb-6">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                ⚡ Interactive Live Code Demo (Try it below right now!)
              </span>
            </div>
            <HeroPlayground />
          </div>
        </div>
      </section>

      {/* 4-Month Milestone Roadmap */}
      <RoadmapSection />

      {/* Pricing & Tuition */}
      <PricingSection />

      {/* FAQs */}
      <FAQSection />

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐍</span>
            <span className="font-bold text-slate-300">PyLearn Pro</span>
            <span>— The 4-Month Python Mastery Online Academy.</span>
          </div>
          <div>
            Built with Next.js, Pyodide Wasm, Supabase & Google Gemini AI.
          </div>
        </div>
      </footer>
    </div>
  )
}
