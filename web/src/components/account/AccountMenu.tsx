'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LogOut, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountMenu({ dark = false }: { dark?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (active) setName(data?.full_name?.trim() || user.email || 'Learner')
    })
    return () => { active = false }
  }, [supabase])

  const initials = (name || email || 'L').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const summaryClass = dark
    ? 'grid h-9 w-9 list-none cursor-pointer place-items-center rounded-full border border-emerald-400/50 bg-emerald-500/15 text-xs font-bold text-emerald-200 [&::-webkit-details-marker]:hidden'
    : 'grid h-9 w-9 list-none cursor-pointer place-items-center rounded-full border border-emerald-700/30 bg-emerald-100 text-xs font-bold text-emerald-900 [&::-webkit-details-marker]:hidden'

  async function signOut() {
    setBusy(true)
    setError('')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError('Sign out did not finish. Please try again.')
      setBusy(false)
      return
    }
    window.location.assign('/')
  }

  return <details className="relative">
    <summary aria-label="Open profile and account actions" title="Profile and account" className={summaryClass}>{initials}</summary>
    <div className={`absolute right-0 z-50 mt-2 w-64 rounded-2xl border p-3 shadow-xl ${dark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-stone-200 bg-white text-stone-900'}`}>
      <p className="truncate px-2 pt-1 text-sm font-semibold">{name || 'My account'}</p>
      <p className={`truncate px-2 pb-3 pt-0.5 text-xs ${dark ? 'text-slate-400' : 'text-stone-500'}`}>{email}</p>
      <Link href="/profile" className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${dark ? 'hover:bg-slate-800' : 'hover:bg-stone-100'}`}><UserRound className="h-4 w-4"/>View or edit profile</Link>
      <button type="button" onClick={() => void signOut()} disabled={busy} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm disabled:opacity-50 ${dark ? 'text-rose-300 hover:bg-slate-800' : 'text-rose-700 hover:bg-rose-50'}`}><LogOut className="h-4 w-4"/>{busy ? 'Signing out…' : 'Sign out'}</button>
      {error && <p role="alert" className="px-2 pt-2 text-xs text-rose-600">{error}</p>}
    </div>
  </details>
}
