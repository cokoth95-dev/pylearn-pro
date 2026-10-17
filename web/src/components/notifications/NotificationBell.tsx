'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Alert = { id: string; kind: string; title: string; body: string; href: string; read_at: string | null; created_at: string }

export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unread, setUnread] = useState(0)
  const [userId, setUserId] = useState('')

  const load = useCallback(async (id: string) => {
    const [{ data }, { count }] = await Promise.all([
      supabase.from('notifications').select('id,kind,title,body,href,read_at,created_at')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(8)
      , supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', id).is('read_at', null)
    ])
    const rows = (data ?? []) as Alert[]
    setAlerts(rows)
    setUnread(count ?? rows.filter((item) => !item.read_at).length)
  }, [supabase])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    let active = true
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return
      setUserId(user.id)
      void load(user.id)
      channel = supabase.channel(`notifications:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void load(user.id))
        .subscribe()
    })
    return () => { active = false; if (channel) void supabase.removeChannel(channel) }
  }, [load, supabase])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    if (userId) await load(userId)
  }

  const muted = dark ? 'text-slate-300 hover:bg-white/10' : 'text-stone-700 hover:bg-stone-100'
  const menu = dark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-stone-200 bg-white text-stone-900'
  return <details className="relative">
    <summary aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} title="Notifications" className={`relative grid h-9 w-9 list-none cursor-pointer place-items-center rounded-full [&::-webkit-details-marker]:hidden ${muted}`}>
      <Bell className="h-4 w-4"/>{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </summary>
    <section className={`absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-xl ${menu}`} aria-label="Recent notifications">
      <div className="flex items-center justify-between border-b border-current/10 px-4 py-3"><h2 className="font-bold">Notifications</h2>{unread > 0 && <button type="button" onClick={async () => { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null); if (userId) await load(userId) }} className="text-xs font-semibold text-emerald-500">Mark all read</button>}</div>
      <div className="max-h-96 overflow-y-auto">
        {alerts.map((alert) => <div key={alert.id} className={`border-b border-current/10 px-4 py-3 ${alert.read_at ? '' : dark ? 'bg-emerald-400/5' : 'bg-emerald-50/70'}`}>
          <div className="flex items-start justify-between gap-2"><Link href={alert.href} onClick={() => { if (!alert.read_at) void markRead(alert.id) }} className="min-w-0 flex-1"><p className="text-sm font-semibold">{alert.title}</p><p className={`mt-0.5 text-xs ${dark ? 'text-slate-400' : 'text-stone-600'}`}>{alert.body}</p><time className={`mt-1 block text-[10px] ${dark ? 'text-slate-500' : 'text-stone-500'}`}>{new Date(alert.created_at).toLocaleString()}</time></Link>{!alert.read_at && <button type="button" onClick={() => void markRead(alert.id)} aria-label={`Mark “${alert.title}” as read`} className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"><Check className="h-4 w-4"/></button>}</div>
        </div>)}
        {alerts.length === 0 && <p className={`px-4 py-8 text-center text-sm ${dark ? 'text-slate-400' : 'text-stone-500'}`}>You’re all caught up.</p>}
      </div>
      <Link href="/notifications" className="block border-t border-current/10 px-4 py-3 text-center text-sm font-semibold text-emerald-600 hover:bg-emerald-500/5">View all notifications</Link>
    </section>
  </details>
}
