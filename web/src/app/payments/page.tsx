"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react'
import AccountMenu from '@/components/account/AccountMenu'
import LearnerSidebar from '@/components/navigation/LearnerSidebar'
import { createClient } from '@/lib/supabase/client'

type Course = { id: string; title: string }
type Settings = { payments_enabled: boolean; paybill_number: string; account_number: string; monthly_amount_kes: number; full_course_amount_kes: number; full_course_regular_amount_kes: number }
type Request = { id: string; course_id: string; purchase_type: 'monthly' | 'full_course'; target_month: number | null; amount_kes: number; receipt_suffix: string; payer_phone: string; status: 'pending' | 'confirmed' | 'declined'; decline_reason: string | null; reviewed_at: string | null; created_at: string }

const field = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

export default function PaymentsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [courseId, setCourseId] = useState('')
  const [purchaseType, setPurchaseType] = useState<'monthly' | 'full_course'>('monthly')
  const [receipt, setReceipt] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { window.location.assign('/login'); return }
    const [settingsResult, courseResult, requestsResult] = await Promise.all([
      supabase.from('payment_settings').select('payments_enabled,paybill_number,account_number,monthly_amount_kes,full_course_amount_kes,full_course_regular_amount_kes').eq('id', true).single(),
      supabase.from('courses').select('id,title').eq('status', 'published').order('title'),
      supabase.from('payment_requests').select('id,course_id,purchase_type,target_month,amount_kes,receipt_suffix,payer_phone,status,decline_reason,reviewed_at,created_at').order('created_at', { ascending: false }),
    ])
    for (const result of [settingsResult, courseResult, requestsResult]) if (result.error) throw result.error
    setSettings(settingsResult.data as Settings)
    const availableCourses = (courseResult.data ?? []) as Course[]
    setCourses(availableCourses)
    setCourseId((previous) => previous || availableCourses[0]?.id || '')
    setRequests((requestsResult.data ?? []) as Request[])
  }, [supabase])

  useEffect(() => {
    let active = true
    async function loadPayments() {
      try { await load() }
      catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Could not load payment details.') }
      finally { if (active) setLoading(false) }
    }
    void loadPayments()
    return () => { active = false }
  }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: submitError } = await supabase.rpc('create_payment_request', { p_course_id: courseId, p_purchase_type: purchaseType, p_receipt_suffix: receipt.trim(), p_payer_phone: phone.trim() })
      if (submitError) throw submitError
      setReceipt(''); setPhone(''); setMessage('Payment details submitted. Your course stays locked until an administrator confirms the M-Pesa payment.')
      await load()
      if (!data) throw new Error('The request was saved, but the confirmation could not be displayed. Refresh this page.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Payment request was not submitted.') }
    finally { setBusy(false) }
  }

  const statusIcon = (status: Request['status']) => status === 'confirmed' ? <CheckCircle2 className="h-4 w-4 text-emerald-700"/> : status === 'declined' ? <XCircle className="h-4 w-4 text-rose-700"/> : <Clock3 className="h-4 w-4 text-amber-700"/>
  const statusLabel = (status: Request['status']) => status === 'confirmed' ? 'Confirmed' : status === 'declined' ? 'Declined' : 'Pending review'

  return <div className="min-h-screen bg-[#faf7f0] text-stone-900">
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:px-8"><Link href="/dashboard" className="flex items-center gap-3"><span className="text-2xl">🐍</span><span className="font-extrabold">PyLearn <span className="text-emerald-700">Pro</span><span className="block text-[10px] font-normal text-stone-500">Learner payments</span></span></Link><div className="flex items-center gap-2"><Link href="/dashboard" className="hidden items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold sm:inline-flex"><ArrowLeft className="h-3.5 w-3.5"/>Dashboard</Link><AccountMenu/></div></header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 md:px-8 lg:grid-cols-[220px_minmax(0,1fr)]"><LearnerSidebar active="payments"/><main className="min-w-0 space-y-6">
      <section><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Manual M-Pesa payment</p><h1 className="mt-1 text-2xl font-extrabold">Payments and access</h1><p className="mt-2 text-sm text-stone-600">Submit the receipt details; an administrator checks the payment against the message received on their side.</p></section>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      {loading ? <div className="rounded-2xl border border-stone-200 bg-white p-8 text-sm text-stone-600"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Loading payment information…</div> : settings && <>
        {!settings.payments_enabled && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Payments are temporarily unavailable.</strong> You can still check previous requests. Existing confirmed course access is not affected.</div>}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-700"/><h2 className="font-bold">How to pay with M-Pesa</h2></div><ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-700"><li>Open M-Pesa and choose <strong>Lipa na M-Pesa → Pay Bill</strong>.</li><li>Business number: <strong>{settings.paybill_number}</strong> (KCB Paybill).</li><li>Account number: <strong>{settings.account_number}</strong>.</li><li>Pay the amount for your selected course option. Keep the confirmation message.</li><li>Enter the last four receipt characters and the phone number used to pay below.</li><li>Access starts after the administrator confirms the payment. Monthly access lasts 30 days from confirmation.</li></ol><div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>Never enter your M-Pesa PIN here. PyLearn Pro does not collect it.</div></section>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Submit a payment</h2><label className="block text-sm font-semibold">Course<select required className={`${field} mt-1`} value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">Choose access</legend><label className={`cursor-pointer rounded-xl border p-4 ${purchaseType === 'monthly' ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200'}`}><input type="radio" name="purchase" checked={purchaseType === 'monthly'} onChange={() => setPurchaseType('monthly')} className="mr-2 accent-emerald-700"/><strong>Next course month</strong><span className="mt-1 block text-sm">KSh {settings.monthly_amount_kes.toLocaleString()} · 30 days</span></label><label className={`cursor-pointer rounded-xl border p-4 ${purchaseType === 'full_course' ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200'}`}><input type="radio" name="purchase" checked={purchaseType === 'full_course'} onChange={() => setPurchaseType('full_course')} className="mr-2 accent-emerald-700"/><strong>Full course</strong><span className="mt-1 block text-sm">KSh {settings.full_course_amount_kes.toLocaleString()} · all paid months</span>{settings.full_course_regular_amount_kes > settings.full_course_amount_kes && <span className="mt-1 block text-xs text-stone-500"><span className="line-through">KSh {settings.full_course_regular_amount_kes.toLocaleString()}</span><span className="ml-2 font-semibold text-amber-800">Save KSh {(settings.full_course_regular_amount_kes - settings.full_course_amount_kes).toLocaleString()}</span></span>}</label></fieldset><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Last 4 M-Pesa receipt characters<input required maxLength={4} minLength={4} pattern="[A-Za-z0-9]{4}" autoComplete="off" className={`${field} mt-1 uppercase`} value={receipt} onChange={(event) => setReceipt(event.target.value.toUpperCase())} placeholder="e.g. A1BC"/></label><label className="block text-sm font-semibold">Payer phone number<input required type="tel" maxLength={20} autoComplete="tel" className={`${field} mt-1`} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 07XX XXX XXX"/></label></div><button disabled={busy || !settings.payments_enabled || !courses.length} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Submitting…' : 'Submit for admin confirmation'}</button></form>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Your payment history</h2><p className="mt-1 text-xs text-stone-500">Declined records are kept for reference. You can submit a new request after a decline.</p><div className="mt-4 divide-y divide-stone-100">{requests.map((request) => <article key={request.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{courses.find((course) => course.id === request.course_id)?.title ?? 'Course'} · {request.purchase_type === 'full_course' ? 'Full course' : `Month ${request.target_month}`}</p><p className="mt-1 text-xs text-stone-500">KSh {request.amount_kes.toLocaleString()} · Receipt …{request.receipt_suffix} · {request.payer_phone} · {new Date(request.created_at).toLocaleString()}</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold">{statusIcon(request.status)}{statusLabel(request.status)}</span></div>{request.status === 'pending' && <p className="mt-2 text-xs text-stone-600">Access will be added after admin confirmation.</p>}{request.status === 'confirmed' && <p className="mt-2 text-xs text-emerald-800">Confirmed {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : ''}. {request.purchase_type === 'monthly' ? 'This month’s access expires 30 days after confirmation.' : 'Full-course access is active.'}</p>}{request.status === 'declined' && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-900">Admin note: {request.decline_reason || 'Please contact the academy administrator.'}</p>}</article>)}{!requests.length && <p className="py-5 text-sm text-stone-500">No payment requests yet.</p>}</div></section>
      </>}
    </main></div>
  </div>
}
