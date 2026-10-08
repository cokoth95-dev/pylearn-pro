'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AccountMenu from '@/components/account/AccountMenu'

export default function GuardianPendingPage() {
  const [userId, setUserId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { void (async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.assign('/login'); return }
    setUserId(user.id)
  })() }, [])

  async function resend() {
    setBusy(true); setMessage(''); setError('')
    try {
      const response = await fetch('/api/guardian/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learnerId: userId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'The email could not be sent.')
      setMessage('A new one-time review link was emailed to the parent or guardian address on file.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The email could not be sent.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#faf7f0] px-4 py-10 text-stone-900"><header className="mx-auto flex max-w-3xl justify-between"><Link href="/" className="font-extrabold text-emerald-800">PyLearn Pro</Link><AccountMenu/></header><section className="mx-auto mt-12 max-w-xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Guardian confirmation needed</p><h1 className="mt-2 text-2xl font-extrabold">Your learning access is waiting</h1><p className="mt-3 text-sm leading-6 text-stone-600">After you verify your email and sign in, request the admission guide and one-time confirmation link for the parent or guardian address provided during sign-up. You can use your profile and payment pages while this is pending, but lessons stay locked until they confirm.</p><button disabled={busy || !userId} onClick={() => void resend()} className="mt-5 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send or resend guardian email'}</button>{message && <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-rose-800">{error}</p>}<p className="mt-5 text-xs text-stone-500"><Link className="underline" href="/profile">Profile</Link> · <Link className="underline" href="/payments">Payments</Link> · Sign out from the account menu.</p></section></main>
}
