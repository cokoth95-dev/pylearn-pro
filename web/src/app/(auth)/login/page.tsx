"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [identifier, setIdentifier] = useState('') // Email or Phone number
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    const cleanIdentifier = identifier.trim()

    try {
      let loginEmail = cleanIdentifier

      // 1. Dual-Credential Resolution: Check if input is a phone number instead of an email
      const isEmail = cleanIdentifier.includes('@')
      if (!isEmail) {
        // Query profiles table to find the email corresponding to this phone number
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone_number', cleanIdentifier)
          .single()

        if (profileErr || !profileData?.email) {
          setErrorMsg('No student account found with this phone number.')
          setIsLoading(false)
          return
        }
        loginEmail = profileData.email
      }

      // 2. Sign in with resolved email + password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      })

      if (error) {
        setErrorMsg('Invalid login credentials. Please check your password.')
        setIsLoading(false)
        return
      }

      // 3. Redirect to Student Classroom Welcome Hub
      router.push('/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🐍</span>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              PyLearn <span className="text-emerald-400">Pro</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white mt-4">Welcome Back, Student!</h2>
          <p className="text-slate-400 text-xs mt-1">Sign in with your Email Address or Phone Number.</p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Dual Identifier Field: Email or Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address or Phone Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="alex@example.com or +254 712 345 678"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <a href="#" className="text-[11px] text-slate-500 hover:text-emerald-400 transition">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In to Classroom'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link href="/register" className="text-cyan-400 font-semibold hover:underline">
              Start Free Month 1
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
