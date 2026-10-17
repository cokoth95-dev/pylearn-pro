'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react'
import AccountMenu from '@/components/account/AccountMenu'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

type Alert = { id: string; kind: 'message' | 'announcement' | 'quiz_feedback' | 'assignment_feedback' | 'instructor_assignment' | 'reminder'; title: string; body: string; href: string; read_at: string | null; created_at: string }
const filters = ['all', 'message', 'announcement', 'learning', 'reminder'] as const
type Filter = typeof filters[number]

function matchesFilter(alert: Alert, filter: Filter) {
  if (filter === 'all') return true
  if (filter === 'learning') return ['quiz_feedback', 'assignment_feedback', 'instructor_assignment'].includes(alert.kind)
  return alert.kind === filter
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [savingEmailPreference, setSavingEmailPreference] = useState(false)
  const [preferenceMessage, setPreferenceMessage] = useState('')
  const load = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('notifications').select('id,kind,title,body,href,read_at,created_at')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(200)
    if (!error) setAlerts((data ?? []) as Alert[])
  }, [supabase])

  useEffect(() => {
    let active = true
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active) return
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      const [{ data: preference },] = await Promise.all([
        supabase.from('notification_preferences').select('email_enabled').eq('user_id', user.id).maybeSingle(),
        load(user.id),
      ])
      if (preference) setEmailEnabled(preference.email_enabled)
      if (!active) return
      channel = supabase.channel(`notifications-page:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void load(user.id))
        .subscribe()
      setLoading(false)
    })
    return () => { active = false; if (channel) void supabase.removeChannel(channel) }
  }, [load, router, supabase])

  async function markAllRead() {
    if (!userId) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
    await load(userId)
  }

  async function setEmailAlerts(enabled: boolean) {
    if (!userId || savingEmailPreference) return
    setSavingEmailPreference(true); setPreferenceMessage('')
    const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, email_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) setPreferenceMessage('Your email alert preference could not be saved.')
    else { setEmailEnabled(enabled); setPreferenceMessage(enabled ? 'Generic email alerts are enabled.' : 'Email alerts are turned off.') }
    setSavingEmailPreference(false)
  }

  const visible = alerts.filter((alert) => matchesFilter(alert, filter))
  const unreadCount = alerts.filter((alert) => !alert.read_at).length
  return <main className="min-h-screen bg-[#faf7f0] text-stone-900">
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700"><ArrowLeft className="h-4 w-4"/>Dashboard</Link><div className="flex items-center gap-2"><ThemeToggle/><AccountMenu/></div></header>
    <section className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Your updates</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold"><Bell className="h-7 w-7 text-emerald-700"/>Notifications</h1><p className="mt-2 text-sm text-stone-600">Messages, course announcements, and learning updates appear here.</p></div><button type="button" onClick={() => void markAllRead()} disabled={!unreadCount} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><CheckCheck className="h-4 w-4"/>Mark all read</button></div>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter notifications">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? 'bg-emerald-700 text-white' : 'border border-stone-300 bg-white text-stone-700'}`}>{item === 'learning' ? 'Learning updates' : item}</button>)}</div>
      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"><div><h2 className="font-bold">Optional email alerts</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600">Emails only say a message, announcement, or feedback is waiting. They never include the message itself. Email alerts are sent by the scheduled notification service and may arrive later than the in-app bell.</p>{preferenceMessage && <p role="status" className="mt-2 text-xs font-semibold text-emerald-800">{preferenceMessage}</p>}</div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={emailEnabled} disabled={savingEmailPreference} onChange={(event) => void setEmailAlerts(event.target.checked)} className="h-4 w-4 accent-emerald-700"/>Email me about important updates</label></section>
      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-sm text-stone-500">Loading notifications…</p> : visible.map((alert) => <article key={alert.id} className={`border-b border-stone-100 p-4 last:border-0 ${!alert.read_at ? 'bg-emerald-50/50' : ''}`}><div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${alert.read_at ? 'bg-stone-200' : 'bg-emerald-600'}`}/><div className="min-w-0 flex-1"><Link href={alert.href} onClick={async () => { if (!alert.read_at) { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', alert.id); await load(userId) } }} className="font-bold hover:text-emerald-800">{alert.title}</Link><p className="mt-1 text-sm text-stone-600">{alert.body}</p><time className="mt-2 block text-xs text-stone-500">{new Date(alert.created_at).toLocaleString()}</time></div><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold capitalize text-stone-600">{alert.kind.replaceAll('_', ' ')}</span></div></article>)}
        {!loading && visible.length === 0 && <p className="p-10 text-center text-sm text-stone-500">No notifications in this category.</p>}
      </div>
    </section>
  </main>
}
