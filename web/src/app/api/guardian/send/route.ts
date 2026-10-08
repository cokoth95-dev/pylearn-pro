import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGuardianConsentRequest } from '@/lib/admission-email'

export async function POST(request: NextRequest) {
  let body: { learnerId?: unknown }
  try { body = await request.json() as { learnerId?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (typeof body.learnerId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.learnerId)) {
    return NextResponse.json({ error: 'A valid learner account is required.' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== body.learnerId) {
    return NextResponse.json({ error: 'Sign in to request your guardian confirmation email.' }, { status: 401 })
  }
  try {
    const result = await sendGuardianConsentRequest(createAdminClient(), body.learnerId, request.nextUrl.origin)
    return result.sent
      ? NextResponse.json({ sent: true })
      : NextResponse.json({ error: result.reason }, { status: result.status })
  } catch {
    return NextResponse.json({ error: 'The guardian email could not be sent. Please try again later.' }, { status: 503 })
  }
}
