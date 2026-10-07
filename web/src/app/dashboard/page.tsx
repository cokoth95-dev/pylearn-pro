"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Award, Flame, Zap, Play, CheckCircle, Clock, ChevronRight, Lock, Sparkles, Layers, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)

  const student = {
    name: "Alex Kamau",
    level: 1,
    xp: 250,
    streak: 3,
    feeStatus: "Free Trial (Month 1 Active)",
    currentSessionId: 1
  }

  const modules = [
    {
      month: 1,
      title: "Foundations & Pure Logic",
      tagline: "Weeks 1–4",
      status: "Active (Free)",
      isUnlocked: true,
      progress: 25,
      sessionsCount: 20
    },
    {
      month: 2,
      title: "Data Structures & File Automation",
      tagline: "Weeks 5–8",
      status: "Milestone Gated",
      isUnlocked: false,
      progress: 0,
      sessionsCount: 20
    },
    {
      month: 3,
      title: "OOP, Web APIs & Microservices",
      tagline: "Weeks 9–12",
      status: "Milestone Gated",
      isUnlocked: false,
      progress: 0,
      sessionsCount: 20
    },
    {
      month: 4,
      title: "Data Science, AI & Web Engineering",
      tagline: "Weeks 13–16",
      status: "Milestone Gated",
      isUnlocked: false,
      progress: 0,
      sessionsCount: 20
    }
  ]

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Student Header */}
      <header className="h-16 px-6 bg-slate-900/80 border-b border-white/5 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐍</span>
          <div>
            <span className="font-extrabold text-base text-white tracking-tight">PyLearn <span className="text-emerald-400">Pro</span></span>
            <span className="text-[10px] text-slate-400 block -mt-1">Student Learning Academy</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-amber-300">
            <Flame className="w-4 h-4 text-amber-400 fill-current" />
            <span>{student.streak} Day Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-purple-300">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>{student.xp} XP (Level {student.level})</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-xs">
              AK
            </div>
            <span className="hidden sm:inline text-slate-200">{student.name}</span>
          </div>
        </div>
      </header>

      {/* Main Student Dashboard Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Welcome Target Card */}
        <div className="rounded-3xl glass-panel p-8 border border-emerald-500/20 glass-glow-emerald relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-slate-900/80 to-cyan-500/10">
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Today's Focus Session
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Day 1: Genesis — Thinking Like a Python Programmer
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Master variables as labeled storage jars, primitive types, and interactive prompts. Complete today's milestone to earn +50 XP and keep your 3-day streak alive!
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/classroom/1"
                className="px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition"
              >
                <Play className="w-4 h-4 fill-current" /> Continue Session →
              </Link>
              <button
                onClick={() => setShowSessionsModal(true)}
                className="px-5 py-3 rounded-xl glass-panel hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400" /> View All Sessions Modal
              </button>
              <button
                onClick={() => setShowFeeModal(true)}
                className="px-5 py-3 rounded-xl glass-panel hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-amber-400" /> Course Outline & Fees
              </button>
            </div>
          </div>
        </div>

        {/* 4-Month Progress Roadmap */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Your 4-Month Python Mastery Journey</h2>
              <p className="text-slate-400 text-xs mt-0.5">Milestone-gated progression across 16 weeks and 4 production capstones.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Month 1 Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((m) => (
              <div
                key={m.month}
                className={`p-6 rounded-2xl glass-panel border transition relative ${
                  m.isUnlocked ? 'border-emerald-500/30 bg-slate-900/60' : 'border-white/5 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Month {m.month} • {m.tagline}
                  </span>
                  {m.isUnlocked ? (
                    <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                      Unlocked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 px-2 py-0.5 rounded bg-slate-800">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{m.title}</h3>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-3">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${m.progress}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-4">
                  <span>{m.sessionsCount} Sessions (30m each)</span>
                  {m.isUnlocked ? (
                    <Link href="/classroom/1" className="text-emerald-400 font-bold hover:underline flex items-center gap-1">
                      Enter Classroom <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-slate-600">Pass Month {m.month - 1} Capstone to Unlock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* MODAL 1: Sessions List Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel rounded-3xl border border-white/10 p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <Layers className="w-5 h-5" />
                <span>Month 1: Foundations & Logic — Sessions List</span>
              </div>
              <button
                onClick={() => setShowSessionsModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 text-xs">
              {[
                { num: 1, title: "Day 1: Genesis — Thinking Like a Python Programmer", done: true, time: "30m" },
                { num: 2, title: "Day 2: Data Types as Physical Containers (Int, Float, Str, Bool)", done: false, time: "30m" },
                { num: 3, title: "Day 3: Control Flow Crossroads — If, Elif, Else Logic", done: false, time: "30m" },
                { num: 4, title: "Day 4: Repeating Clocks — While and For Loop Iterations", done: false, time: "30m" },
                { num: 5, title: "Day 5: Capstone 1: Automated Personal Expense & Budget Auditor", done: false, time: "45m" }
              ].map((sess) => (
                <div
                  key={sess.num}
                  className="p-3.5 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between hover:border-emerald-500/30 transition"
                >
                  <div className="flex items-center gap-3">
                    {sess.done ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                        {sess.num}
                      </div>
                    )}
                    <span className={sess.done ? 'text-slate-400 line-through' : 'text-white font-medium'}>
                      {sess.title}
                    </span>
                  </div>

                  <Link
                    href={`/classroom/${sess.num}`}
                    onClick={() => setShowSessionsModal(false)}
                    className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 font-semibold text-[11px] transition"
                  >
                    Launch IDE →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Course Outline & Fee Structure Breakdown Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-3xl glass-panel rounded-3xl border border-white/10 p-6 max-h-[85vh] flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <DollarSign className="w-5 h-5" />
                <span>4-Month Course Outline & Tuition Breakdown</span>
              </div>
              <button
                onClick={() => setShowFeeModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="py-4 space-y-6 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <strong>Your Current Status:</strong> Month 1 Active (100% Free Trial). You have access to all Week 1–4 sessions and Capstone 1.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">Month 1</div>
                  <div className="text-xl font-bold text-white mt-1">FREE ($0)</div>
                  <p className="text-[11px] text-slate-400 mt-2">Foundations, Syntax & Logic</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 bg-emerald-500/5">
                  <div className="text-[11px] text-emerald-400 font-bold uppercase">Full 4-Month Bundle</div>
                  <div className="text-xl font-bold text-white mt-1">$149 / KSh 18,500</div>
                  <p className="text-[11px] text-emerald-300 mt-2">All 16 weeks + Verified PDF Cert</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
                  <div className="text-[11px] text-cyan-400 font-bold uppercase">Monthly Plan</div>
                  <div className="text-xl font-bold text-white mt-1">$49 / KSh 6,500/mo</div>
                  <p className="text-[11px] text-slate-400 mt-2">Pay month by month as you learn</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Supported Payment Gateways:</h4>
                <p className="text-slate-400 text-xs">
                  We accept <strong>Credit/Debit Cards (Stripe)</strong>, <strong>MPesa / Mobile Money</strong>, <strong>PayPal</strong>, and direct bank transfers. You can upload transaction proof directly for instant admin activation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
