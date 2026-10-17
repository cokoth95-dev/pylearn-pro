import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const genericEmailCopy: Record<string, { subject: string; sentence: string }> = {
  message: { subject: 'You have a new PyLearn Pro message', sentence: 'A new message is waiting in your PyLearn Pro inbox.' },
  announcement: { subject: 'A PyLearn Pro course announcement is waiting', sentence: 'A course instructor posted an announcement for your class.' },
  assignment_feedback: { subject: 'Your PyLearn Pro instructor left feedback', sentence: 'New learning feedback is ready in your PyLearn Pro account.' },
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || process.env.OTP_FROM_EMAIL
  if (!apiKey || !from) return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })

  const supabase = createAdminClient()
  const { data: pending, error: queueError } = await supabase.from('notifications')
    .select('id,user_id,kind').eq('email_status', 'pending').order('created_at').limit(50)
  if (queueError) return NextResponse.json({ error: 'Could not read the email queue' }, { status: 500 })

  let sent = 0
  let failed = 0
  for (const alert of pending ?? []) {
    const copy = genericEmailCopy[alert.kind]
    if (!copy) {
      await supabase.from('notifications').update({ email_status: 'not_requested' }).eq('id', alert.id)
      continue
    }
    const [{ data: preference }, { data: authUser }] = await Promise.all([
      supabase.from('notification_preferences').select('email_enabled').eq('user_id', alert.user_id).maybeSingle(),
      supabase.auth.admin.getUserById(alert.user_id),
    ])
    if (!preference?.email_enabled || !authUser.user?.email || !authUser.user.email_confirmed_at) {
      await supabase.from('notifications').update({ email_status: 'not_requested' }).eq('id', alert.id)
      continue
    }
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://web-mu-seven-40.vercel.app')
    const appOrigin = configuredOrigin.replace(/\/+$/, '')
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [authUser.user.email], subject: copy.subject,
        html: `<div style="font-family:Arial,sans-serif;color:#292524;line-height:1.6"><p>${copy.sentence}</p><p><a href="${appOrigin}/notifications">Open your notifications</a></p><p style="font-size:12px;color:#78716c">This email contains no message text. You can turn off email alerts in Notification settings.</p></div>`,
      }),
    }).catch(() => null)
    if (response?.ok) {
      await supabase.from('notifications').update({ email_status: 'sent' }).eq('id', alert.id)
      sent++
    } else {
      await supabase.from('notifications').update({ email_status: 'failed' }).eq('id', alert.id)
      failed++
    }
  }
  return NextResponse.json({ processed: (pending ?? []).length, sent, failed })
}
