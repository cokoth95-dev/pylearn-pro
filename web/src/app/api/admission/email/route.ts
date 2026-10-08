import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendLearnerAdmissionCopy } from '@/lib/admission-email'

export async function POST(request: Request) {
  let body: { acceptanceId?: unknown }
  try { body = await request.json() as typeof body }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (typeof body.acceptanceId !== 'string') return NextResponse.json({ error: 'Choose a saved admission copy.' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Sign in to email your saved copy.' }, { status: 401 })
  const result = await sendLearnerAdmissionCopy(createAdminClient(), user.id, body.acceptanceId, user.email, new URL(request.url).origin)
  return result.sent
    ? NextResponse.json({ sent: true })
    : NextResponse.json({ error: result.reason }, { status: 503 })
}
