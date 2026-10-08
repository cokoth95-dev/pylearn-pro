import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendLearnerAdmissionCopy } from '@/lib/admission-email'

export async function POST(request: Request) {
  let body: { read?: unknown; materials?: unknown }
  try { body = await request.json() as typeof body }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Sign in with a verified email to accept the guide.' }, { status: 401 })
  const { data: acceptanceId, error } = await supabase.rpc('accept_current_admission_document', {
    p_read: body.read === true,
    p_materials: body.materials === true,
  })
  if (error || typeof acceptanceId !== 'string') return NextResponse.json({ error: error?.message ?? 'Your acceptance could not be saved.' }, { status: 400 })
  try {
    const delivery = await sendLearnerAdmissionCopy(createAdminClient(), user.id, acceptanceId, user.email, new URL(request.url).origin)
    return NextResponse.json({ accepted: true, acceptanceId, emailSent: delivery.sent, emailMessage: delivery.sent ? null : delivery.reason })
  } catch {
    return NextResponse.json({ accepted: true, acceptanceId, emailSent: false, emailMessage: 'Your saved copy is available under Profile. Email delivery is temporarily unavailable.' })
  }
}
