"use client"

import React from 'react'
import { BookOpen, Layers, Network, Cpu, Lock, CheckCircle2, Award } from 'lucide-react'

export default function RoadmapSection() {
  const modules = [
    {
      month: 1,
      isFree: true,
      title: "Foundations & Pure Logic",
      analogy: "Storage jars, road crossroads, and repeating clocks",
      tagline: "Weeks 1–4",
      skills: ["Variables & Data Types", "Input/Output & String Formatting", "If/Else Decision Trees", "While & For Loops", "Bug Debugging"],
      capstone: "Automated Personal Budget & Expense Auditor",
      icon: BookOpen,
      color: "emerald"
    },
    {
      month: 2,
      isFree: false,
      title: "Data Structures & File Automation",
      analogy: "Shopping carts, telephone directories, and office filing cabinets",
      tagline: "Weeks 5–8",
      skills: ["Lists, Tuples & Matrix Slicing", "Dictionaries & Key-Value Lookups", "File I/O (CSV & TXT Handling)", "Custom Exception Handling", "List Comprehensions"],
      capstone: "Smart File Organizer & Automated Excel Report Generator",
      icon: Layers,
      color: "cyan"
    },
    {
      month: 3,
      isFree: false,
      title: "OOP, Web APIs & Microservices",
      analogy: "Architectural blueprints, restaurant menus, and kitchen orders",
      tagline: "Weeks 9–12",
      skills: ["Functions & Scope Architecture", "Classes, Methods & Inheritance", "HTTP Requests & REST APIs", "JSON Data Parsing", "Modular Python Packaging"],
      capstone: "Live Financial Stock & Weather Multi-City Dashboard",
      icon: Network,
      color: "purple"
    },
    {
      month: 4,
      isFree: false,
      title: "Data Science, AI & Web Engineering",
      analogy: "Interactive spreadsheets and AI brain pattern recognition",
      tagline: "Weeks 13–16",
      skills: ["NumPy & Pandas Data Manipulation", "Google Gemini AI SDK Integration", "Building Web Interfaces (FastAPI/Streamlit)", "Production Cloud Deployment", "Portfolio Packaging"],
      capstone: "Full-Stack AI Data Analyst Web Application",
      icon: Cpu,
      color: "rose"
    }
  ]

  return (
    <section id="curriculum" className="py-24 relative bg-slate-950/40">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            16-Week Mastery Blueprint
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            The 4-Month <span className="text-cyan-400">Milestone-Gated Roadmap</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            Every abstract concept is grounded in everyday physical surroundings. Each week unlocks only when you pass the automated assignment tests.
          </p>
        </div>

        {/* 4-Month Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.month}
                className="rounded-2xl glass-panel p-8 border border-white/10 hover:border-white/20 transition relative flex flex-col justify-between"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Month {m.month} • {m.tagline}</div>
                      <h3 className="text-xl font-bold text-white">{m.title}</h3>
                    </div>
                  </div>

                  {m.isFree ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                      100% Free
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-white/10 text-slate-400 text-[11px] font-semibold">
                      <Lock className="w-3 h-3" /> Milestone Gated
                    </span>
                  )}
                </div>

                {/* Everyday Surroundings Analogy */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-amber-300/90 mb-5 flex items-start gap-2">
                  <span className="text-base">🏠</span>
                  <div>
                    <strong className="text-amber-200">Surroundings Model:</strong> {m.analogy}
                  </div>
                </div>

                {/* Skills Checklist */}
                <div className="space-y-2 mb-6">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Skills Mastered:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    {m.skills.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capstone Project Box */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-400">Capstone Project:</span>
                    <strong className="text-white">{m.capstone}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
