import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type CbkRateResponse = { date?: string; rate?: number; base?: string; quote?: string }

async function refreshCbkRate() {
  const upstream = await fetch('https://api.frankfurter.dev/v2/providers/cbk/rate/usd/kes', {
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
    headers: { accept: 'application/json' },
  })
  if (!upstream.ok) throw new Error(`The CBK rate feed returned HTTP ${upstream.status}.`)

  const payload = await upstream.json() as CbkRateResponse
  const rate = Number(payload.rate)
  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || !Number.isFinite(rate) || rate <= 0 || rate > 1000) {
    throw new Error('The CBK rate feed returned an invalid USD/KSh rate.')
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('payment_settings').update({
    usd_kes_rate: rate,
    usd_kes_rate_date: payload.date,
    usd_kes_rate_source: 'CBK indicative rate via Frankfurter',
    updated_at: new Date().toISOString(),
  }).eq('id', true).select('usd_kes_rate,usd_kes_rate_date,usd_kes_rate_source,monthly_amount_usd,full_course_amount_usd,full_course_regular_amount_usd').single()
  if (error) throw new Error('The new exchange rate could not be saved.')
  return data
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }
  try {
    const rate = await refreshCbkRate()
    return NextResponse.json({ success: true, rate })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The daily rate could not be refreshed.' }, { status: 503 })
  }
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in as an administrator.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
  try {
    const rate = await refreshCbkRate()
    return NextResponse.json({ success: true, rate })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The daily rate could not be refreshed.' }, { status: 503 })
  }
}
