'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react'
import AccountMenu from '@/components/account/AccountMenu'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { visibleStreak } from '@/lib/learning-streak'

type Profile = { full_name: string; xp: number; streak_count: number; last_activity_date: string | null; role: 'student' | 'instructor' | 'admin' }
const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15'

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { window.location.assign('/login'); return }
      setUserId(user.id)
      const { data, error: profileError } = await supabase.from('profiles').select('full_name,xp,streak_count,last_activity_date,role').eq('id', user.id).maybeSingle()
      if (!active) return
      if (profileError || !data) setError(profileError?.message ?? 'Your profile could not be found.')
      else {
        setProfile(data as Profile)
        setName(data.full_name ?? '')
        setEmail(user.email ?? '')
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [supabase])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    const cleanName = name.trim()
    if (cleanName.length < 2 || cleanName.length > 80) { setError('Use a name between 2 and 80 characters.'); return }
    setSaving(true); setError(''); setMessage('')
    const { error: saveError } = await supabase.from('profiles').update({ full_name: cleanName }).eq('id', userId)
    if (saveError) setError('We could not save your name. Please try again.')
    else { setName(cleanName); setProfile({ ...profile, full_name: cleanName }); setMessage('Your profile was saved.') }
    setSaving(false)
  }

  return <main className="min-h-screen bg-[#faf7f0] text-stone-900">
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-emerald-800"><ArrowLeft className="h-4 w-4"/>Learning dashboard</Link>
      <div className="flex items-center gap-2"><ThemeToggle/><AccountMenu/></div>
    </header>
    <section className="mx-auto max-w-2xl px-4 py-10 md:px-8">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Your account</p>
      <h1 className="mt-1 text-3xl font-extrabold">Profile details</h1>
      <p className="mt-2 text-sm text-stone-600">Update your display name. Your sign-in email and learning records are protected.</p>
      {loading ? <p className="mt-8 flex items-center gap-2 text-sm text-stone-600"><LoaderCircle className="h-4 w-4 animate-spin"/>Loading your profile…</p> : <form onSubmit={saveProfile} className="mt-7 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <label className="block text-sm font-semibold">Full name<input required minLength={2} maxLength={80} className={`${inputClass} mt-1.5`} value={name} onChange={(event) => setName(event.target.value)}/></label>
        <label className="block text-sm font-semibold">Sign-in email<input readOnly className={`${inputClass} mt-1.5 cursor-not-allowed bg-stone-100 text-stone-600`} value={email}/><span className="mt-1 block text-xs font-normal text-stone-500">Changing the email needs a separate verification step.</span></label>
        {profile && <div className="grid gap-3 sm:grid-cols-3"><ReadOnlyStat label="Account type" value={profile.role}/><ReadOnlyStat label="XP earned" value={String(profile.xp)}/><ReadOnlyStat label="Current learning streak" value={`${visibleStreak(profile.streak_count, profile.last_activity_date)} days`}/></div>}
        <button disabled={saving || !profile} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>}
    </section>
  </main>
}

function ReadOnlyStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 truncate text-sm font-bold capitalize">{value}</p></div>
}
