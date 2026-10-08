import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { admissionEmailHtml, buildAdmissionPdf, sendAdmissionEmail, type FeeSnapshot } from '@/lib/admission-document'

type PublishedDocument = { version: number; title: string; content_markdown: string }

export async function sendGuardianConsentRequest(admin: SupabaseClient, learnerId: string, origin: string) {
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('id,full_name,age,guardian_name,guardian_email,guardian_consent_status')
    .eq('id', learnerId).maybeSingle()
  if (profileError || !profile || !profile.age || profile.age >= 18 || profile.guardian_consent_status === 'verified' || !profile.guardian_email) {
    return { sent: false, status: 400, reason: 'Guardian consent is not required or the learner profile is incomplete.' }
  }
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recent, error: recentError } = await admin.from('guardian_consent_tokens')
    .select('id').eq('learner_id', learnerId).gte('created_at', oneHourAgo)
  if (recentError) return { sent: false, status: 500, reason: 'The guardian message could not be prepared.' }
  if ((recent?.length ?? 0) >= 3) return { sent: false, status: 429, reason: 'A guardian link was sent recently. Please wait before requesting another.' }

  const [{ data: document }, { data: fees }] = await Promise.all([
    admin.from('admission_document_versions').select('version,title,content_markdown').order('version', { ascending: false }).limit(1).maybeSingle(),
    admin.from('payment_settings').select('*').eq('id', true).maybeSingle(),
  ])
  if (!document) return { sent: false, status: 503, reason: 'The admission guide is not available yet.' }
  await admin.from('guardian_consent_tokens').delete().eq('learner_id', learnerId).is('consumed_at', null)
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { error: tokenError } = await admin.from('guardian_consent_tokens').insert({
    learner_id: learnerId,
    document_version: document.version,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })
  if (tokenError) return { sent: false, status: 500, reason: 'The guardian link could not be created.' }

  const guardianUrl = `${origin}/guardian/consent?token=${token}`
  const pdf = buildAdmissionPdf(document.title, document.content_markdown, document.version, 'For guardian review', (fees ?? {}) as FeeSnapshot)
  const delivery = await sendAdmissionEmail(
    profile.guardian_email,
    `Please review ${document.title} for ${profile.full_name}`,
    `${admissionEmailHtml(document.title, document.content_markdown, guardianUrl, 'Review and confirm guardian permission')}<p style="font-family:Arial,sans-serif;line-height:1.6">As the learner's parent or legal guardian, please review the attached guide. This one-time confirmation link expires in seven days.</p>`,
    pdf,
    `PyLearn-Pro-Admission-v${document.version}.pdf`,
  )
  if (!delivery.sent) {
    await admin.from('guardian_consent_tokens').delete().eq('token_hash', tokenHash)
    return { sent: false, status: 503, reason: delivery.reason }
  }
  return { sent: true, status: 200 }
}

export async function sendLearnerAdmissionCopy(admin: SupabaseClient, learnerId: string, acceptanceId: string, email: string, origin: string) {
  const { data: acceptance, error } = await admin.from('admission_acceptances')
    .select('id,learner_id,document_version,document_title,content_snapshot,fee_snapshot,accepted_at')
    .eq('id', acceptanceId).eq('learner_id', learnerId).maybeSingle()
  if (error || !acceptance) return { sent: false, reason: 'The saved admission copy could not be found.' }
  const fees = (acceptance.fee_snapshot ?? {}) as FeeSnapshot
  const pdf = buildAdmissionPdf(acceptance.document_title, acceptance.content_snapshot, acceptance.document_version, acceptance.accepted_at, fees)
  const profileUrl = `${origin}/profile`
  return sendAdmissionEmail(
    email,
    `Your PyLearn Pro admission document (version ${acceptance.document_version})`,
    admissionEmailHtml(acceptance.document_title, acceptance.content_snapshot, profileUrl),
    pdf,
    `PyLearn-Pro-Admission-v${acceptance.document_version}.pdf`,
  )
}
