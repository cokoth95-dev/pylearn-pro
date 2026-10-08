"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PasswordStrengthMeter, { validatePassword } from '@/components/auth/PasswordStrengthMeter'
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const supabase = createClient()

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    age: '',
    guardianName: '',
    guardianEmail: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const { score } = validatePassword(formData.password)
    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.')
      return
    }
    if (score < 2) {
      setErrorMsg('Please choose a stronger password matching the criteria checklist below.')
      return
    }
    const age = Number(formData.age)
    if (!Number.isInteger(age) || age < 10 || age > 120) {
      setErrorMsg('Enter your age in years (10 to 120).')
      return
    }
    if (age < 18 && (formData.guardianName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardianEmail.trim()))) {
      setErrorMsg('Learners under 18 must provide a parent or guardian name and email.')
      return
    }
    if (age < 18 && formData.guardianEmail.trim().toLowerCase() === formData.email.trim().toLowerCase()) {
      setErrorMsg('Please enter a separate parent or guardian email address.')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            age,
            guardian_name: age < 18 ? formData.guardianName.trim() : null,
            guardian_email: age < 18 ? formData.guardianEmail.trim().toLowerCase() : null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
        }
      })

      if (error) {
        setErrorMsg(error.message)
        setIsLoading(false)
        return
      }

      if (age < 18) {
        setSuccessMsg(`Your account is created and will remain locked until a guardian confirms. Verify your email and sign in; then we will send the one-time admission guide link to ${formData.guardianEmail.trim()}.`)
      } else {
        setSuccessMsg('Your account is created. Check your email and verify it before signing in. You will review the Admission Document on your first login.')
      }
      setIsLoading(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🐍</span>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              PyLearn <span className="text-emerald-400">Pro</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white mt-4">Create Your Student Account</h2>
          <p className="text-slate-400 text-xs mt-1">Get instant access to Month 1 (Foundations & Logic) 100% Free.</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2" role="status">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Kamau"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Age in years</label>
              <input type="number" required min={10} max={120} value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition" />
              <p className="mt-1 text-[11px] text-slate-500">We ask for your age, not your date of birth. Learners under 18 need a parent or guardian to confirm access.</p>
            </div>

            {Number(formData.age) > 0 && Number(formData.age) < 18 && <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-xs leading-5 text-amber-100">A parent or legal guardian must review the Admission Document and confirm permission before lessons open.</p>
              <label className="block text-xs font-semibold text-slate-300">Parent or guardian full name<input type="text" required maxLength={120} value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-xs text-white"/></label>
              <label className="block text-xs font-semibold text-slate-300">Parent or guardian email<input type="email" required value={formData.guardianEmail} onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-xs text-white"/></label>
            </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Create Strong Password (8+ characters)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <PasswordStrengthMeter password={formData.password} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Complete Registration & Start Free'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
              Log In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
