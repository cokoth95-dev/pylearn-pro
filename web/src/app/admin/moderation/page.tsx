'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Report = { id: string; message_id: string; reporter_id: string; reason: string; details: string | null; status: string; created_at: string }
type Review = { report: { id: string; reason: string; details: string | null; status: string }; reported_message: { id: string; sender_id: string; body: string; created_at: string }; context: Array<{ id: string; sender_id: string; body: string; created_at: string; deleted_at: string | null }> }

export default function MessageModerationPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [review, setReview] = useState<Review | null>(null)
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadReports() {
    const { data, error: loadError } = await supabase.from('message_reports')
      .select('id,message_id,reporter_id,reason,details,status,created_at').order('created_at', { ascending: false })
    if (loadError) setError('The moderation queue could not be loaded.')
    else setReports((data ?? []) as Report[])
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (!active) return
      if (data?.role !== 'admin') { setAccess('denied'); return }
      setAccess('allowed')
      await loadReports()
    })()
    return () => { active = false }
  // The queue is loaded only after confirming the administrator role.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  async function inspect(reportId: string) {
    setBusy(true); setError('')
    const { data, error: reviewError } = await supabase.rpc('admin_review_message_report', { p_report_id: reportId, p_purpose: 'Review user-reported conversation content' })
    if (reviewError) setError('Could not open the report for review.')
    else setReview(data as Review)
    setBusy(false)
  }

  async function resolve(reportId: string, status: 'reviewing' | 'resolved' | 'dismissed', hide: boolean) {
    setBusy(true); setError('')
    const { error: saveError } = await supabase.rpc('admin_resolve_message_report', {
      p_report_id: reportId, p_status: status,
      p_resolution: status === 'reviewing' ? 'Review in progress.' : status === 'dismissed' ? 'Report reviewed and dismissed.' : 'Report reviewed and resolved.',
      p_hide_message: hide,
    })
    if (saveError) setError('Could not update the report.')
    else { setReview(null); await loadReports() }
    setBusy(false)
  }

  if (access === 'loading') return <main className="min-h-screen bg-stone-50 p-8 text-center text-stone-600">Checking administrator access…</main>
  if (access === 'denied') return <main className="min-h-screen bg-stone-50 p-8 text-center text-stone-800">Administrator access required. <Link href="/dashboard" className="underline">Return to dashboard</Link></main>
  return <main className="min-h-screen bg-[#faf7f0] text-stone-900"><header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8"><Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4"/>Admin panel</Link><span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4"/>Restricted moderation</span></header><div className="mx-auto max-w-6xl p-4 md:p-8"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Reported content only</p><h1 className="mt-1 text-3xl font-extrabold">Course message reports</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">Administrators do not browse private learner–instructor conversations. Opening a report records an audit entry and reveals only the reported message with nearby thread context.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="mt-6 grid gap-4 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]"><section className="rounded-2xl border border-stone-200 bg-white p-4"><h2 className="font-bold">Reports · {reports.length}</h2><div className="mt-3 space-y-2">{reports.map((report) => <button key={report.id} type="button" onClick={() => void inspect(report.id)} disabled={busy} className={`w-full rounded-xl border p-3 text-left ${review?.report.id === report.id ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}><span className="flex items-center justify-between gap-2"><span className="font-semibold capitalize">{report.reason}</span><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] capitalize">{report.status}</span></span><span className="mt-1 block text-xs text-stone-500">{new Date(report.created_at).toLocaleString()}</span>{report.details && <span className="mt-2 block line-clamp-2 text-xs text-stone-600">{report.details}</span>}</button>)}{reports.length === 0 && <p className="py-8 text-center text-sm text-stone-500">No reports have been submitted.</p>}</div></section><section className="rounded-2xl border border-stone-200 bg-white p-4">{review ? <><h2 className="text-lg font-bold">Review report</h2><p className="mt-1 text-sm text-stone-600">Reason: {review.report.reason}{review.report.details ? ` · ${review.report.details}` : ''}</p><div className="mt-4 space-y-2">{review.context.map((message) => <article key={message.id} className={`rounded-xl border p-3 ${message.id === review.reported_message.id ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}><p className="text-[10px] text-stone-500">{message.id === review.reported_message.id ? 'Reported message' : 'Nearby context'} · participant {message.sender_id.slice(0, 8)} · {new Date(message.created_at).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap text-sm">{message.deleted_at ? 'Message was previously hidden.' : message.body}</p></article>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void resolve(review.report.id, 'reviewing', false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Mark reviewing</button><button type="button" disabled={busy} onClick={() => void resolve(review.report.id, 'resolved', true)} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white">Hide message and resolve</button><button type="button" disabled={busy} onClick={() => void resolve(review.report.id, 'resolved', false)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Resolve without hiding</button><button type="button" disabled={busy} onClick={() => void resolve(review.report.id, 'dismissed', false)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold">Dismiss report</button></div></> : <div className="grid min-h-64 place-items-center text-center text-sm text-stone-500">Choose a report to inspect its message and nearby context.</div>}</section></div></div></main>
}
