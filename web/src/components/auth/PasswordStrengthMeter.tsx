"use client"

import React, { useState } from 'react'
import { Check, X, Shield, Lock, Eye, EyeOff } from 'lucide-react'

interface PasswordCriteria {
  length: boolean
  upper: boolean
  lower: boolean
  number: boolean
  special: boolean
}

export function validatePassword(pwd: string): { criteria: PasswordCriteria; score: number } {
  const criteria = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd)
  }

  let score = 0
  if (criteria.length) score += 1
  if (criteria.upper && criteria.lower) score += 1
  if (criteria.number) score += 1
  if (criteria.special) score += 1

  return { criteria, score }
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const { criteria, score } = validatePassword(password)

  const getStrengthLabel = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-700', text: 'text-slate-500' }
    if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' }
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' }
    if (score === 3) return { label: 'Good', color: 'bg-cyan-500', text: 'text-cyan-400' }
    return { label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-400' }
  }

  const strength = getStrengthLabel()

  return (
    <div className="space-y-2 mt-2">
      {/* Progress Bars */}
      <div className="flex gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`flex-1 rounded-full transition-all duration-300 ${score >= step ? strength.color : 'bg-slate-800'}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Password Strength:</span>
        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
        <span className={`flex items-center gap-1 ${criteria.length ? 'text-emerald-400' : ''}`}>
          {criteria.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-slate-600" />} At least 8 characters
        </span>
        <span className={`flex items-center gap-1 ${criteria.upper && criteria.lower ? 'text-emerald-400' : ''}`}>
          {criteria.upper && criteria.lower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-slate-600" />} Uppercase & lowercase
        </span>
        <span className={`flex items-center gap-1 ${criteria.number ? 'text-emerald-400' : ''}`}>
          {criteria.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-slate-600" />} At least 1 number (0-9)
        </span>
        <span className={`flex items-center gap-1 ${criteria.special ? 'text-emerald-400' : ''}`}>
          {criteria.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-slate-600" />} Special character (!@#$)
        </span>
      </div>
    </div>
  )
}
