'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    setErrorMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) {
        setErrorMessage(error.status === 429
          ? 'Too many reset requests were made recently. Please wait before trying again.'
          : 'We could not submit the reset request right now. Please wait a moment and try again.')
        return
      }
      setNotice('If an account uses that email, a password reset link will be sent shortly. Check your inbox and spam folder.')
    } catch {
      setErrorMessage('We could not submit the reset request right now. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#090d16] flex items-center justify-center p-6 text-white">
    <section className="w-full max-w-md glass-panel p-8 rounded-2xl border border-white/10">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="text-sm text-slate-400 mt-2">We’ll email you a secure reset link.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">Email address<input className="mt-2 w-full rounded-xl bg-slate-900 border border-white/10 p-3" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <button disabled={busy} className="w-full rounded-xl bg-emerald-400 text-slate-950 font-bold p-3 disabled:opacity-60">{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      {notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}
      {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-700">{errorMessage}</p>}
      <Link className="inline-block mt-5 text-sm text-slate-400 hover:text-white" href="/login">Back to sign in</Link>
    </section>
  </main>
}
