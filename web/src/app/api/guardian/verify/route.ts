import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  let body: { token?: unknown; confirmed?: unknown }
  try { body = await request.json() as { token?: unknown; confirmed?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (body.confirmed !== true || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/i.test(body.token)) {
    return NextResponse.json({ error: 'This guardian link is invalid or expired.' }, { status: 400 })
  }
  try {
    const hash = createHash('sha256').update(body.token).digest('hex')
    const { error } = await createAdminClient().rpc('confirm_guardian_admission', { p_token_hash: hash })
    if (error) return NextResponse.json({ error: 'This guardian link is invalid, expired, already used, or needs a newer document.' }, { status: 400 })
    return NextResponse.json({ confirmed: true })
  } catch {
    return NextResponse.json({ error: 'Guardian confirmation is temporarily unavailable.' }, { status: 503 })
  }
}
