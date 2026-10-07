"use client"

import React, { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const faqs = [
    {
      q: "I have zero programming or math background. Can I really learn Python here?",
      a: "Yes, 100%! PyLearn Pro is specifically engineered for complete beginners and laymen. We never throw raw jargon or complex math formulas at you. Every single concept is explained through physical things you touch every day—like kitchen recipes, storage jars, shopping carts, and telephone books."
    },
    {
      q: "Do I need to install Python, VS Code, or complex terminal tools on my computer?",
      a: "Not at all! Our in-browser Code Studio runs full Python 3.12 WebAssembly (Pyodide) directly inside your web browser. You can start coding on Day 1 from any laptop, Chromebook, or computer without installing anything."
    },
    {
      q: "How does Month 1 Free access work?",
      a: "When you sign up, Month 1 (Foundations & Logic Mastery, Weeks 1 to 4) is completely free. You get access to the interactive IDE, video explanations, flashcards, automated test cases, and your first capstone project. No credit card is required."
    },
    {
      q: "What payment methods are supported for unlocking Months 2 through 4?",
      a: "We support Stripe (Credit/Debit cards), MPesa / Mobile Money, PayPal, and direct bank transfers. If you pay via MPesa or bank, you can upload your transaction code/receipt directly on your dashboard for instant 1-click verification."
    },
    {
      q: "What happens if my code doesn't work on an assignment?",
      a: "Our integrated Google Gemini 3.6 Flash AI Tutor acts as your 24/7 personal coding mentor. It inspects your code, identifies where you got stuck, and offers gentle, Socratic hints using everyday analogies—helping you fix the problem without giving away the answer."
    },
    {
      q: "Will I receive a verified certificate upon graduation?",
      a: "Yes! When you complete all 16 weeks and pass all 4 Capstone projects, the system automatically generates a verifiable high-resolution digital PDF certificate. It includes a unique verification link and embedded QR code, along with a 1-click 'Add to LinkedIn Profile' button."
    }
  ]

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything You Need To Know
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            Have questions about the 4-month program, sandbox environment, or tuition? We have answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={idx}
                className="rounded-2xl glass-panel border border-white/10 overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition"
                >
                  <span className="font-semibold text-white text-base">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-slate-300 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
