'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type GuardianDocument = { version: number; title: string; content_markdown: string }
type Details = { learnerName: string; guardianName: string; guardianEmail: string; document: GuardianDocument }

export default function GuardianConsent({ token }: { token: string }) {
  const [details, setDetails] = useState<Details | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setError('This guardian link is invalid.'); setLoading(false); return }
    void fetch(`/api/guardian/details?token=${encodeURIComponent(token)}`).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'The admission guide could not be loaded.')
      setDetails(data as Details)
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The admission guide could not be loaded.')).finally(() => setLoading(false))
  }, [token])

  async function accept() {
    if (!confirmed) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/guardian/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, confirmed: true }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Guardian confirmation failed.')
      setError('Guardian consent is recorded. The learner can verify their email, sign in, and accept their copy of the admission guide.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Guardian confirmation failed.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#faf7f0] px-4 py-10 text-stone-900"><section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9">
    <Link href="/" className="text-sm font-bold text-emerald-800">PyLearn Pro</Link><p className="mt-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Parent or guardian review</p>
    {loading ? <p className="mt-5 text-sm text-stone-600">Loading the guide…</p> : error && !details ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{error}</p> : details && <>
      <h1 className="mt-1 text-2xl font-extrabold">Please review the admission guide</h1><p className="mt-2 text-sm leading-6 text-stone-600">This request is for {details.learnerName}. The one-time link was sent to {details.guardianEmail} and is tied to guide version {details.document.version}.</p>
      <article className="mt-6 max-h-[55vh] overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm leading-6">{details.document.content_markdown.split('\n').map((line, index) => <p key={index} className={line.startsWith('## ') ? 'mt-4 font-bold first:mt-0' : line.startsWith('- ') ? 'ml-4 list-item list-disc' : line ? 'mt-2' : 'h-2'}>{line.startsWith('## ') ? line.slice(3) : line.startsWith('- ') ? line.slice(2) : line}</p>)}</article>
      <label className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>I am the parent or legal guardian of {details.learnerName}. I have reviewed this guide and confirm permission for the learner to use PyLearn Pro.</span></label>
      <button disabled={!confirmed || busy} onClick={() => void accept()} className="mt-4 w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving confirmation…' : 'Confirm guardian permission'}</button>
      {error && details && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{error}</p>}
    </>}
  </section></main>
}
