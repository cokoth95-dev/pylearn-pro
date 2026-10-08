import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGuardianConsentRequest } from '@/lib/admission-email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in as an administrator.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
  try {
    const admin = createAdminClient()
    const { data: learners, error } = await admin.from('profiles')
      .select('id').eq('guardian_consent_status', 'pending')
      .order('id').limit(100)
    if (error) return NextResponse.json({ error: 'Guardian notifications could not be loaded.' }, { status: 500 })
    let sent = 0
    const failures: string[] = []
    for (const learner of learners ?? []) {
      if (!learner.id) continue
      const result = await sendGuardianConsentRequest(admin, learner.id, new URL(request.url).origin)
      if (result.sent) sent += 1
      else failures.push(result.reason ?? 'A guardian notification could not be sent.')
    }
    return NextResponse.json({ sent, total: learners?.length ?? 0, failed: failures.length, error: failures[0] ?? null })
  } catch {
    return NextResponse.json({ error: 'Guardian notifications could not be sent.' }, { status: 503 })
  }
}
