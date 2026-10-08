import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAdmissionPdf, type FeeSnapshot } from '@/lib/admission-document'

export async function GET(request: NextRequest, context: { params: Promise<{ acceptanceId: string }> }) {
  const { acceptanceId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to download your admission copy.' }, { status: 401 })
  const admin = createAdminClient()
  const { data: acceptance } = await admin.from('admission_acceptances')
    .select('id,learner_id,document_version,document_title,content_snapshot,fee_snapshot,accepted_at')
    .eq('id', acceptanceId).eq('learner_id', user.id).maybeSingle()
  if (!acceptance) return NextResponse.json({ error: 'Saved admission copy not found.' }, { status: 404 })
  const pdf = buildAdmissionPdf(acceptance.document_title, acceptance.content_snapshot, acceptance.document_version, acceptance.accepted_at, (acceptance.fee_snapshot ?? {}) as FeeSnapshot)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PyLearn-Pro-Admission-v${acceptance.document_version}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
