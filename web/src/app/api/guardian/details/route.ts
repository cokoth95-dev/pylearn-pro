import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ error: 'This guardian link is invalid or expired.' }, { status: 400 })
  try {
    const admin = createAdminClient()
    const hash = createHash('sha256').update(token).digest('hex')
    const { data: row, error } = await admin.from('guardian_consent_tokens')
      .select('id,learner_id,document_version,expires_at,consumed_at').eq('token_hash', hash).maybeSingle()
    if (error || !row || row.consumed_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This guardian link is invalid, expired, or already used.' }, { status: 400 })
    }
    const [{ data: learner }, { data: document }] = await Promise.all([
      admin.from('profiles').select('full_name,guardian_name,guardian_email').eq('id', row.learner_id).maybeSingle(),
      admin.from('admission_document_versions').select('version,title,content_markdown').eq('version', row.document_version).maybeSingle(),
    ])
    if (!learner || !document) return NextResponse.json({ error: 'The admission information is unavailable.' }, { status: 404 })
    return NextResponse.json({ learnerName: learner.full_name, guardianName: learner.guardian_name, guardianEmail: learner.guardian_email, document })
  } catch {
    return NextResponse.json({ error: 'The guardian document could not be loaded.' }, { status: 503 })
  }
}
