import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGuardianConsentRequest } from '@/lib/admission-email'

export async function POST(request: NextRequest) {
  let body: { age?: unknown; guardianName?: unknown; guardianEmail?: unknown }
  try { body = await request.json() as typeof body }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const age = Number(body.age)
  if (!Number.isInteger(age) || age < 10 || age > 120) return NextResponse.json({ error: 'Enter an age from 10 to 120.' }, { status: 400 })
  const guardianName = typeof body.guardianName === 'string' ? body.guardianName.trim() : ''
  const guardianEmail = typeof body.guardianEmail === 'string' ? body.guardianEmail.trim().toLowerCase() : ''
  if (age < 18 && (guardianName.length < 2 || guardianName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail))) {
    return NextResponse.json({ error: 'For learners under 18, enter a parent or guardian name and email.' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('id,age,role').eq('id', user.id).maybeSingle()
  if (profileError || !profile || profile.role !== 'student') return NextResponse.json({ error: 'Learner profile could not be updated.' }, { status: 403 })
  if (profile.age !== null) return NextResponse.json({ error: 'Your age has already been recorded. Contact support if it needs correction.' }, { status: 409 })
  const { error } = await admin.from('profiles').update({
    age,
    guardian_name: age < 18 ? guardianName : null,
    guardian_email: age < 18 ? guardianEmail : null,
    guardian_consent_status: age < 18 ? 'pending' : 'not_required',
    guardian_consent_verified_at: null,
    guardian_consent_version: null,
  }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Your learner information could not be saved.' }, { status: 500 })
  if (age < 18) {
    const result = await sendGuardianConsentRequest(admin, user.id, request.nextUrl.origin)
    if (!result.sent) return NextResponse.json({ guardianPending: true, error: result.reason }, { status: result.status })
    return NextResponse.json({ guardianPending: true, sent: true })
  }
  return NextResponse.json({ guardianPending: false })
}
