'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AccountMenu from '@/components/account/AccountMenu'

type Doc = { version: number; title: string; content_markdown: string; requires_reacceptance: boolean }
type Fees = { monthly_amount_kes: number; monthly_amount_usd: number; full_course_amount_kes: number; full_course_amount_usd: number; full_course_regular_amount_kes: number; full_course_regular_amount_usd: number; payments_enabled: boolean; monthly_payments_enabled: boolean; full_course_payments_enabled: boolean }

const inputClass = 'mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15'

export default function AdmissionPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState<number | null>(null)
  const [guardianPending, setGuardianPending] = useState(false)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [fees, setFees] = useState<Fees | null>(null)
  const [read, setRead] = useState(false)
  const [materials, setMaterials] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [emailSent, setEmailSent] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [ageValue, setAgeValue] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')

  useEffect(() => { let active = true; void (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.assign('/login'); return }
    const [gateResult, docResult, feeResult] = await Promise.all([
      supabase.rpc('get_my_admission_gate'),
      supabase.from('admission_document_versions').select('version,title,content_markdown,requires_reacceptance').order('version', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payment_settings').select('monthly_amount_kes,monthly_amount_usd,full_course_amount_kes,full_course_amount_usd,full_course_regular_amount_kes,full_course_regular_amount_usd,payments_enabled,monthly_payments_enabled,full_course_payments_enabled').eq('id', true).maybeSingle(),
    ])
    if (!active) return
    if (gateResult.error || docResult.error || feeResult.error) setError('The admission guide could not be loaded. Please refresh or contact support.')
    const gate = gateResult.data as { role?: string; age_missing?: boolean; guardian_pending?: boolean } | null
    if (gate?.role !== 'student') { window.location.assign('/dashboard'); return }
    setUserId(user.id); setEmail(user.email ?? '')
    setAge(gate.age_missing ? null : 18)
    setGuardianPending(Boolean(gate.guardian_pending))
    setDoc(docResult.data as Doc | null); setFees(feeResult.data as Fees | null)
    setLoading(false)
  })(); return () => { active = false } }, [supabase])

  async function saveAge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admission/age', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ age: Number(ageValue), guardianName, guardianEmail }) })
      const result = await response.json()
      if (result.guardianPending) { setAge(Number(ageValue)); setGuardianPending(true); setMessage('A guardian confirmation link is required before lessons can open.') }
      else if (!response.ok) throw new Error(result.error ?? 'Your information could not be saved.')
      else setAge(Number(ageValue))
      if (!response.ok && !result.guardianPending) throw new Error(result.error ?? 'Your information could not be saved.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your information could not be saved.') }
    finally { setSaving(false) }
  }

  async function resendGuardian() {
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/guardian/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learnerId: userId }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'The guardian email could not be sent.')
      setMessage(`The guardian review link was sent to ${guardianEmail || 'the email on your account'}.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The guardian email could not be sent.') }
    finally { setSaving(false) }
  }

  async function submitAcceptance() {
    if (!read || !materials) return
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admission/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read, materials }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Your response could not be saved.')
      setAccepted(true); setEmailSent(result.emailSent); setMessage(result.emailSent ? `Your accepted guide was emailed to ${email} and saved in your profile.` : 'Your acceptance and profile copy are saved. The PDF email could not be sent yet.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your response could not be saved.') }
    finally { setSaving(false) }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#faf7f0] text-stone-700">Loading your admission information…</main>
  return <main className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 p-3 sm:p-6" aria-labelledby="admission-title">
    <section role="dialog" aria-modal="true" className="mx-auto my-3 max-w-3xl rounded-3xl border border-stone-200 bg-[#fffefa] p-5 text-stone-900 shadow-2xl sm:my-8 sm:p-8">
      <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Required first-login step</p><AccountMenu/></div>
      <h1 id="admission-title" className="mt-1 text-2xl font-extrabold">{doc?.title ?? 'Admission Document'}</h1>
      <p className="mt-2 text-sm text-stone-600">Read the guide and send your response to continue to lessons. Version {doc?.version ?? '—'}.</p>
      <p className="mt-2 text-xs text-stone-500">Related notices: <Link className="font-semibold text-emerald-800 underline" href="/terms">Terms of Use</Link> · <Link className="font-semibold text-emerald-800 underline" href="/privacy">Privacy Notice</Link></p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      {age === null && <form onSubmit={saveAge} className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-bold">Before we continue</h2><p className="text-sm leading-6">Tell us your age so we can use the right guardian process. We ask for age in years, not your full date of birth.</p><label className="block text-sm font-semibold">Age<input required type="number" min="10" max="120" value={ageValue} onChange={(event) => setAgeValue(event.target.value)} className={inputClass}/></label>{Number(ageValue) > 0 && Number(ageValue) < 18 && <><label className="block text-sm font-semibold">Parent or guardian full name<input required maxLength={120} value={guardianName} onChange={(event) => setGuardianName(event.target.value)} className={inputClass}/></label><label className="block text-sm font-semibold">Parent or guardian email<input required type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} className={inputClass}/></label></>}<button disabled={saving} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Continue'}</button></form>}
      {guardianPending && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-bold">Guardian confirmation needed</h2><p className="mt-1 text-sm leading-6">Your parent or guardian must review this document and confirm permission before lessons open.</p><button disabled={saving} onClick={() => void resendGuardian()} className="mt-3 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Sending…' : 'Send or resend guardian link'}</button></section>}
      {!accepted && age !== null && !guardianPending && doc && <>
        <article className="mt-5 max-h-[44vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-6" aria-label="Admission document content">{doc.content_markdown.split('\n').map((line, index) => <p key={index} className={line.startsWith('## ') ? 'mt-4 font-bold first:mt-0' : line.startsWith('- ') ? 'ml-4 list-item list-disc' : line ? 'mt-2' : 'h-2'}>{line.startsWith('## ') ? line.slice(3) : line.startsWith('- ') ? line.slice(2) : line}</p>)}</article>
        {fees && <section className="mt-4 rounded-2xl bg-stone-100 p-4"><h2 className="font-bold">Current published fees</h2><div className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><p>Monthly: KSh {fees.monthly_amount_kes.toLocaleString()} / ${fees.monthly_amount_usd.toFixed(2)} {fees.payments_enabled && fees.monthly_payments_enabled ? '· available' : '· not currently available'}</p><p>Full course: KSh {fees.full_course_amount_kes.toLocaleString()} / ${fees.full_course_amount_usd.toFixed(2)} {fees.payments_enabled && fees.full_course_payments_enabled ? '· available' : '· not currently available'}</p><p className="sm:col-span-2">Full-course savings: KSh {Math.max(0, fees.full_course_regular_amount_kes - fees.full_course_amount_kes).toLocaleString()} / ${(fees.full_course_regular_amount_usd - fees.full_course_amount_usd).toFixed(2)}</p></div><p className="mt-2 text-xs text-stone-600">Your profile copy records these amounts as they appear now.</p></section>}
        <div className="mt-5 space-y-3"><label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm leading-6"><input type="checkbox" checked={read} onChange={(event) => setRead(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700"/><span>I have read and understood the Admission Document.</span></label><label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm leading-6"><input type="checkbox" checked={materials} onChange={(event) => setMaterials(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700"/><span>I have the materials needed for this course.</span></label></div>
        <button disabled={saving || !read || !materials} onClick={() => void submitAcceptance()} className="mt-4 w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving your response…' : 'Submit and continue'}</button>
      </>}
      {accepted && <div className="mt-5 flex flex-wrap gap-3"><Link href="/dashboard" className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">Continue to learning</Link>{emailSent === false && <button onClick={() => window.location.assign('/profile')} className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold">View saved copy in Profile</button>}</div>}
      <p className="mt-5 text-center text-xs text-stone-500">Your learning dashboard and lessons remain locked until you submit both acknowledgments.</p>
      <div className="mt-2 flex justify-center gap-4 text-xs"><Link className="text-emerald-800 underline" href="/profile">Profile</Link><Link className="text-emerald-800 underline" href="/payments">Payments</Link></div>
    </section>
  </main>
}
