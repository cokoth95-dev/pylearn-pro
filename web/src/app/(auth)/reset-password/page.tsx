'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setMessage(error ? 'The reset link may have expired. Request a new one and try again.' : 'Password updated. You can now sign in.')
    setBusy(false)
    if (!error) window.setTimeout(() => router.replace('/login'), 1200)
  }

  return <main className="min-h-screen bg-[#090d16] flex items-center justify-center p-6 text-white">
    <section className="w-full max-w-md glass-panel p-8 rounded-2xl border border-white/10">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">New password<input className="mt-2 w-full rounded-xl bg-slate-900 border border-white/10 p-3" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={busy} className="w-full rounded-xl bg-emerald-400 text-slate-950 font-bold p-3 disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
      <Link className="inline-block mt-5 text-sm text-slate-400 hover:text-white" href="/login">Back to sign in</Link>
    </section>
  </main>
}
