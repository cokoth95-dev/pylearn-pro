"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/theme/ThemeToggle'
import AccountMenu from '@/components/account/AccountMenu'
import { BookOpen, CheckCircle2, CreditCard, FileText, GraduationCap, Image as ImageIcon, LayoutDashboard, LoaderCircle, LockKeyhole, Plus, RefreshCw, ShieldCheck, Users, type LucideIcon } from 'lucide-react'

type Course = { id: string; slug: string; title: string; language_code: string; description: string; status: 'draft' | 'published' | 'archived' }
type Module = { id: number; course_id: string; month_number: number; title: string; tagline: string | null; description: string | null; is_free: boolean; order_index: number; status: 'draft' | 'published' | 'archived' }
type Session = { id: number; module_id: number; session_number: number; title: string; analogy_physical: string; content_markdown: string; starter_code: string; hints: string[]; xp_reward: number; duration_minutes: number; quick_check: { question?: string; options?: string[] } }
type LessonDraft = { session_number: number; title: string; analogy: string; content: string; starterCode: string; hints: string[]; xp: number; duration: number; question: string; options: string[]; correctOption: number; explanation: string }
type LessonAnswer = { correctOption: number; explanation: string }
type Person = { id: string; full_name: string; role: 'student' | 'instructor' | 'admin'; created_at: string }
type CourseInstructor = { course_id: string; instructor_id: string }
type View = 'overview' | 'courses' | 'curriculum' | 'instructors' | 'hero' | 'payments' | 'admissions'
type SiteSettings = { hero_image_url: string | null; hero_image_opacity: number }
type PaymentRequest = { id: string; student_id: string; course_id: string; purchase_type: 'monthly' | 'full_course'; target_month: number | null; amount_kes: number; receipt_suffix: string; payer_phone: string; status: 'pending' | 'confirmed' | 'declined'; decline_reason: string | null; created_at: string }
type PaymentPricing = { monthly_amount_kes: number; full_course_amount_kes: number; full_course_regular_amount_kes: number; monthly_amount_usd: number; full_course_amount_usd: number; full_course_regular_amount_usd: number }
type PaymentSettings = PaymentPricing & { payments_enabled: boolean; monthly_payments_enabled: boolean; full_course_payments_enabled: boolean; paybill_number: string; account_number: string; usd_kes_rate: number | null; usd_kes_rate_date: string | null; usd_kes_rate_source: string | null }
type AdmissionDocument = { version: number; title: string; content_markdown: string; requires_reacceptance: boolean; published_at: string }

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50'

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), [])
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const [view, setView] = useState<View>('overview')
  const [courses, setCourses] = useState<Course[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [courseInstructors, setCourseInstructors] = useState<CourseInstructor[]>([])
  const [heroSettings, setHeroSettings] = useState<SiteSettings>({ hero_image_url: null, hero_image_opacity: 28 })
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [paymentPricingDraft, setPaymentPricingDraft] = useState<PaymentPricing | null>(null)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [admissionDocument, setAdmissionDocument] = useState<AdmissionDocument | null>(null)
  const [admissionDraft, setAdmissionDraft] = useState({ title: '', content_markdown: '' })
  const [admissionMajorChange, setAdmissionMajorChange] = useState(false)
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({})
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedInstructor, setSelectedInstructor] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [courseForm, setCourseForm] = useState({ title: '', slug: '', language_code: 'python', description: '' })
  const [weekForm, setWeekForm] = useState({ month_number: '1', week_number: '1', title: '', description: '' })

  const loadData = useCallback(async () => {
    setErrorMessage('')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { window.location.assign('/login'); return }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) throw profileError
    if (profile?.role !== 'admin') { setAccess('denied'); return }

    const [courseResult, moduleResult, sessionResult, personResult, instructorResult, siteSettingsResult, paymentSettingsResult, paymentRequestsResult, admissionResult, admissionDraftResult] = await Promise.all([
      supabase.from('courses').select('id,slug,title,language_code,description,status').order('created_at'),
      supabase.from('modules').select('id,course_id,month_number,title,tagline,description,is_free,order_index,status').order('course_id').order('month_number').order('order_index'),
      supabase.from('sessions').select('id,module_id,session_number,title,analogy_physical,content_markdown,starter_code,hints,xp_reward,duration_minutes,quick_check').order('module_id').order('session_number'),
      supabase.from('profiles').select('id,full_name,role,created_at').order('full_name'),
      supabase.from('course_instructors').select('course_id,instructor_id'),
      supabase.from('site_settings').select('hero_image_url,hero_image_opacity').eq('id', 'main').maybeSingle(),
      supabase.from('payment_settings').select('payments_enabled,monthly_payments_enabled,full_course_payments_enabled,paybill_number,account_number,monthly_amount_kes,full_course_amount_kes,full_course_regular_amount_kes,monthly_amount_usd,full_course_amount_usd,full_course_regular_amount_usd,usd_kes_rate,usd_kes_rate_date,usd_kes_rate_source').eq('id', true).maybeSingle(),
      supabase.from('payment_requests').select('id,student_id,course_id,purchase_type,target_month,amount_kes,receipt_suffix,payer_phone,status,decline_reason,created_at').order('created_at', { ascending: false }),
      supabase.from('admission_document_versions').select('version,title,content_markdown,requires_reacceptance,published_at').order('version', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('admission_document_draft').select('title,content_markdown').eq('id', true).maybeSingle(),
    ])
    for (const result of [courseResult, moduleResult, sessionResult, personResult, instructorResult, siteSettingsResult, paymentSettingsResult, paymentRequestsResult, admissionResult, admissionDraftResult]) {
      if (result.error) throw result.error
    }
    setCourses((courseResult.data ?? []) as Course[])
    setModules((moduleResult.data ?? []) as Module[])
    setSessions((sessionResult.data ?? []) as Session[])
    setPeople((personResult.data ?? []) as Person[])
    setCourseInstructors((instructorResult.data ?? []) as CourseInstructor[])
    if (siteSettingsResult.data) setHeroSettings(siteSettingsResult.data as SiteSettings)
    if (paymentSettingsResult.data) {
      const settings = paymentSettingsResult.data as PaymentSettings
      setPaymentSettings(settings)
      setPaymentPricingDraft({ monthly_amount_kes: settings.monthly_amount_kes, full_course_amount_kes: settings.full_course_amount_kes, full_course_regular_amount_kes: settings.full_course_regular_amount_kes, monthly_amount_usd: settings.monthly_amount_usd, full_course_amount_usd: settings.full_course_amount_usd, full_course_regular_amount_usd: settings.full_course_regular_amount_usd })
    }
    setPaymentRequests((paymentRequestsResult.data ?? []) as PaymentRequest[])
    if (admissionResult.data) setAdmissionDocument(admissionResult.data as AdmissionDocument)
    if (admissionDraftResult.data) setAdmissionDraft(admissionDraftResult.data as { title: string; content_markdown: string })
    setSelectedCourse((current) => current || courseResult.data?.[0]?.id || '')
    setAccess('allowed')
  }, [supabase])

  const refreshPaymentQueue = useCallback(async () => {
    const { data, error } = await supabase.from('payment_requests').select('id,student_id,course_id,purchase_type,target_month,amount_kes,receipt_suffix,payer_phone,status,decline_reason,created_at').order('created_at', { ascending: false })
    if (!error) setPaymentRequests((data ?? []) as PaymentRequest[])
  }, [supabase])

  useEffect(() => {
    async function initializeWorkspace() {
      try { await loadData() }
      catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'We could not load the admin workspace.')
        setAccess('denied')
      }
    }
    void initializeWorkspace()
  }, [loadData])

  useEffect(() => {
    if (access !== 'allowed') return
    const timer = window.setInterval(() => { void refreshPaymentQueue() }, 30000)
    return () => window.clearInterval(timer)
  }, [access, refreshPaymentQueue])

  async function perform(action: () => Promise<{ error: { message: string } | null }>, success: string): Promise<boolean> {
    setBusy(true); setMessage(''); setErrorMessage('')
    try {
      const result = await action()
      if (result.error) throw new Error(result.error.message)
      setMessage(success)
      await loadData()
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The change could not be saved.')
      return false
    } finally { setBusy(false) }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const slug = courseForm.slug.trim() || slugify(courseForm.title)
    const saved = await perform(async () => await supabase.from('courses').insert({ ...courseForm, slug, status: 'draft' }), 'Draft course created. Add its weeks, review them, then publish when ready.')
    if (saved) setCourseForm({ title: '', slug: '', language_code: 'python', description: '' })
  }

  async function saveCourse(course: Course, patch: Partial<Course>) {
    await perform(async () => await supabase.from('courses').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', course.id), 'Course details saved.')
  }

  async function createWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse) return
    const month = Number(weekForm.month_number)
    const week = Number(weekForm.week_number)
    const title = weekForm.title.trim()
    if (!title || month < 1 || month > 4 || week < 1 || week > 4) {
      setErrorMessage('Enter a title and choose a month and week from 1 to 4.')
      return
    }
    const saved = await perform(async () => await supabase.from('modules').insert({
      course_id: selectedCourse,
      month_number: month,
      order_index: week,
      title,
      tagline: `Week ${week} · Sessions ${(week - 1) * 5 + 1}–${week * 5}`,
      description: weekForm.description.trim(),
      capstone_title: null,
      is_free: month === 1,
      status: 'draft',
    }), 'Draft week created. Add lesson content before publishing it.')
    if (saved) setWeekForm((current) => ({ ...current, title: '', description: '' }))
  }

  async function assignInstructor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse || !selectedInstructor) return
    const saved = await perform(async () => await supabase.rpc('admin_assign_course_instructor', {
      p_course_id: selectedCourse,
      p_profile_id: selectedInstructor,
    }), 'Instructor role and course assignment saved.')
    if (saved) setSelectedInstructor('')
  }

  async function removeInstructor(courseId: string, profileId: string) {
    await perform(async () => await supabase.rpc('admin_remove_course_instructor', {
      p_course_id: courseId,
      p_profile_id: profileId,
    }), 'Course assignment removed. The person keeps their instructor role.')
  }

  async function saveLesson(moduleId: number, sessionId: number | null, draft: LessonDraft) {
    return perform(async () => await supabase.rpc('admin_save_lesson', {
      p_session_id: sessionId,
      p_module_id: moduleId,
      p_session_number: draft.session_number,
      p_title: draft.title,
      p_analogy: draft.analogy,
      p_content_markdown: draft.content,
      p_starter_code: draft.starterCode,
      p_hints: draft.hints,
      p_xp_reward: draft.xp,
      p_duration_minutes: draft.duration,
      p_question: draft.question,
      p_options: draft.options,
      p_correct_option: draft.correctOption,
      p_explanation: draft.explanation,
    }), sessionId ? 'Lesson and private quick-check answer saved.' : 'Lesson and private answer key created.')
  }

  async function getLessonAnswer(sessionId: number): Promise<LessonAnswer | null> {
    const { data, error } = await supabase.rpc('admin_get_lesson_key', { p_session_id: sessionId })
    if (error) { setErrorMessage(error.message); return null }
    const key = data as { correct_option: number; explanation: string }
    return { correctOption: key.correct_option, explanation: key.explanation }
  }

  async function saveHeroOpacity() {
    await perform(async () => await supabase.from('site_settings').update({ hero_image_opacity: heroSettings.hero_image_opacity, updated_at: new Date().toISOString() }).eq('id', 'main'), 'Hero image visibility saved.')
  }

  async function uploadHeroImage(file: File | undefined) {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type)) { setErrorMessage('Choose a JPG, PNG, WebP, or AVIF image.'); return }
    if (file.size > 5 * 1024 * 1024) { setErrorMessage('Choose an image smaller than 5 MB.'); return }
    setBusy(true); setMessage(''); setErrorMessage('')
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string, string>)[file.type]
    const path = `hero/${crypto.randomUUID()}.${extension}`
    const upload = await supabase.storage.from('site-assets').upload(path, file, { contentType: file.type, upsert: false })
    if (upload.error) { setErrorMessage(upload.error.message); setBusy(false); return }
    const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(path)
    const save = await supabase.from('site_settings').update({ hero_image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', 'main')
    if (save.error) {
      await supabase.storage.from('site-assets').remove([path])
      setErrorMessage(save.error.message)
    } else {
      setHeroSettings((current) => ({ ...current, hero_image_url: publicUrl }))
      setMessage('Hero background image uploaded and published.')
    }
    setBusy(false)
  }

  async function removeHeroImage() {
    setBusy(true); setMessage(''); setErrorMessage('')
    const result = await supabase.from('site_settings').update({ hero_image_url: null, updated_at: new Date().toISOString() }).eq('id', 'main')
    if (result.error) setErrorMessage(result.error.message)
    else { setHeroSettings((current) => ({ ...current, hero_image_url: null })); setMessage('Hero background image removed.') }
    setBusy(false)
  }

  async function reviewPayment(id: string, decision: 'confirmed' | 'declined') {
    const result = await perform(async () => await supabase.rpc('admin_review_payment_request', { p_request_id: id, p_decision: decision, p_decline_reason: decision === 'declined' ? declineReasons[id]?.trim() ?? '' : null }), decision === 'confirmed' ? 'Payment confirmed and access granted.' : 'Payment declined. The learner can see the reason and submit again.')
    if (result) setDeclineReasons((current) => ({ ...current, [id]: '' }))
  }

  async function savePaymentPricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentPricingDraft) return
    if (paymentPricingDraft.full_course_regular_amount_kes < paymentPricingDraft.full_course_amount_kes) {
      setErrorMessage('The full-course regular KSh price must be at least as high as its sale price.')
      return
    }
    await perform(async () => await supabase.from('payment_settings').update({ monthly_amount_kes: paymentPricingDraft.monthly_amount_kes, full_course_amount_kes: paymentPricingDraft.full_course_amount_kes, full_course_regular_amount_kes: paymentPricingDraft.full_course_regular_amount_kes, updated_at: new Date().toISOString() }).eq('id', true), 'KSh prices saved. USD display prices are calculated from the current CBK rate.')
  }

  async function refreshExchangeRate() {
    setBusy(true); setMessage(''); setErrorMessage('')
    try {
      const response = await fetch('/api/exchange-rate', { method: 'POST' })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'The exchange rate could not be refreshed.')
      setMessage('The latest CBK indicative rate was saved. USD prices have been recalculated.')
      await loadData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The exchange rate could not be refreshed. The previous saved rate is still in use.')
    } finally { setBusy(false) }
  }

  async function saveAdmissionDraft() {
    await perform(async () => await supabase.rpc('admin_save_admission_draft', {
      p_title: admissionDraft.title,
      p_content_markdown: admissionDraft.content_markdown,
    }), 'Admission guide draft saved. It is not visible to learners until published.')
  }

  async function publishAdmissionDocument() {
    const published = await perform(async () => {
      const draft = await supabase.rpc('admin_save_admission_draft', { p_title: admissionDraft.title, p_content_markdown: admissionDraft.content_markdown })
      if (draft.error) return draft
      const result = await supabase.rpc('admin_publish_admission_document', { p_requires_reacceptance: admissionMajorChange })
      return result.error ? result : { error: null }
    }, admissionMajorChange ? 'Major admission guide update published. Learners and affected guardians will need to review it again.' : 'Admission guide update published without forcing current learners to accept it again.')
    if (published) {
      if (admissionMajorChange) {
        try {
          const response = await fetch('/api/admission/notify-guardians', { method: 'POST' })
          const result = await response.json()
          if (response.ok) setMessage(`${result.sent} of ${result.total} guardian review emails sent.${result.failed ? ` ${result.failed} could not be sent: ${result.error ?? 'Email service unavailable.'}` : ''}`)
          else setErrorMessage(result.error ?? 'The new guide is published, but guardian emails could not be sent.')
        } catch { setErrorMessage('The new guide is published, but guardian emails could not be sent. Check the email setup and resend from the guardian workflow.') }
      }
      setAdmissionMajorChange(false)
    }
  }

  const selectedCourseRow = courses.find((course) => course.id === selectedCourse)
  const selectedCourseModules = modules.filter((module) => module.course_id === selectedCourse)
  const studentCount = people.filter((person) => person.role === 'student').length
  const instructorCount = people.filter((person) => person.role === 'instructor').length

  if (access === 'loading') return <main className="grid min-h-screen place-items-center bg-[#faf7f0] text-stone-700"><p className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin"/> Checking administrator access…</p></main>
  if (access === 'denied') return <main className="mx-auto grid min-h-screen max-w-xl place-items-center bg-[#faf7f0] p-6 text-stone-800"><section className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm"><LockKeyhole className="mx-auto mb-3 h-8 w-8 text-amber-700"/><h1 className="text-xl font-bold">Admin access required</h1><p className="mt-2 text-sm leading-6 text-stone-600">This page is for PyLearn Pro administrators. If you are the academy owner, your account must be promoted once in Supabase before you can enter.</p>{errorMessage && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-left text-xs text-rose-800">{errorMessage}</p>}<Link className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white" href="/dashboard">Back to learner dashboard</Link></section></main>

  const nav: { id: View; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
    { id: 'curriculum', label: 'Curriculum review', icon: BookOpen },
    { id: 'instructors', label: 'Instructors', icon: Users },
    { id: 'admissions', label: 'Admission guide', icon: FileText },
    { id: 'payments', label: `Payments${paymentRequests.filter((request) => request.status === 'pending').length ? ` · ${paymentRequests.filter((request) => request.status === 'pending').length}` : ''}`, icon: CreditCard },
    { id: 'hero', label: 'Landing hero image', icon: ImageIcon },
  ]

  return <div className="admin-console min-h-screen bg-[#faf7f0] text-stone-900">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><ShieldCheck className="h-5 w-5"/></div><div><h1 className="font-extrabold">PyLearn Pro <span className="text-emerald-700">Admin</span></h1><p className="text-xs text-stone-500">Course and curriculum management</p></div></div>
      <div className="flex items-center gap-2"><ThemeToggle/><Link href="/dashboard" className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Learner view</Link><AccountMenu/></div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ${view === id ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-white'}`}><Icon className="h-4 w-4"/>{label}</button>)}</aside>
      <main className="min-w-0 space-y-6">
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
        {errorMessage && access === 'allowed' && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{errorMessage}</p>}

        {view === 'overview' && <>
          <section><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Academy administration</p><h2 className="mt-1 text-2xl font-extrabold">Good to see you, Administrator</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Prepare courses, review draft weeks before learners see them, and assign instructors to the courses they support.</p></section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: 'Courses', value: courses.length, icon: GraduationCap },
            { label: 'Draft weeks to review', value: modules.filter((module) => module.status === 'draft').length, icon: BookOpen },
            { label: 'Instructors', value: instructorCount, icon: Users },
            { label: 'Learners', value: studentCount, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-emerald-700"/><p className="mt-4 text-sm text-stone-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></article>)}</div>
          <section className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-bold">Review queue</h3><div className="mt-3 divide-y divide-stone-100">{modules.filter((module) => module.status === 'draft').map((module) => <div key={module.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{module.title}</p><p className="text-xs text-stone-500">{courses.find((course) => course.id === module.course_id)?.title} · Month {module.month_number} · {module.tagline}</p></div><button onClick={() => { setSelectedCourse(module.course_id); setView('curriculum') }} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Review week</button></div>)}{modules.every((module) => module.status !== 'draft') && <p className="py-3 text-sm text-stone-500">No draft weeks are waiting for review.</p>}</div></section>
        </>}

        {view === 'courses' && <>
          <section><h2 className="text-2xl font-extrabold">Courses</h2><p className="mt-1 text-sm text-stone-600">Create and edit course details. Draft courses are hidden from learners.</p></section>
          <form onSubmit={createCourse} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <h3 className="font-bold md:col-span-2">Create a course</h3>
            <input required className={inputClass} placeholder="Course title" value={courseForm.title} onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value }))}/>
            <input className={inputClass} placeholder="Slug (made from title if blank)" value={courseForm.slug} onChange={(event) => setCourseForm((current) => ({ ...current, slug: event.target.value }))}/>
            <input required className={inputClass} placeholder="Language code, such as python" value={courseForm.language_code} onChange={(event) => setCourseForm((current) => ({ ...current, language_code: event.target.value }))}/>
            <input className={inputClass} placeholder="Short course description" value={courseForm.description} onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))}/>
            <button disabled={busy} className={buttonClass}><Plus className="h-4 w-4"/>Create draft course</button>
          </form>
          <div className="space-y-4">{courses.map((course) => <CourseCard key={course.id} course={course} moduleCount={modules.filter((module) => module.course_id === course.id).length} busy={busy} onSave={(patch) => saveCourse(course, patch)}/>)}</div>
        </>}

        {view === 'curriculum' && <>
          <section><h2 className="text-2xl font-extrabold">Curriculum review</h2><p className="mt-1 text-sm text-stone-600">Review the week and its lessons. Publishing a week makes its lessons available to entitled learners.</p></section>
          <label className="block max-w-xl text-xs font-semibold text-stone-600">Course<select className={`${inputClass} mt-1`} value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title} ({course.status})</option>)}</select></label>
          {selectedCourse && <form onSubmit={createWeek} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2"><h3 className="font-bold md:col-span-2">Add a draft week</h3><select className={inputClass} value={weekForm.month_number} onChange={(event) => setWeekForm((current) => ({ ...current, month_number: event.target.value }))}>{[1,2,3,4].map((month) => <option key={month} value={month}>Month {month}</option>)}</select><select className={inputClass} value={weekForm.week_number} onChange={(event) => setWeekForm((current) => ({ ...current, week_number: event.target.value }))}>{[1,2,3,4].map((week) => <option key={week} value={week}>Week {week}</option>)}</select><input required className={inputClass} placeholder="Week title" value={weekForm.title} onChange={(event) => setWeekForm((current) => ({ ...current, title: event.target.value }))}/><input className={inputClass} placeholder="Learning goal" value={weekForm.description} onChange={(event) => setWeekForm((current) => ({ ...current, description: event.target.value }))}/><button disabled={busy} className={buttonClass}><Plus className="h-4 w-4"/>Create draft week</button></form>}
          <div className="space-y-4">{selectedCourseModules.map((module) => <ModuleCard key={module.id} module={module} sessions={sessions.filter((session) => session.module_id === module.id)} busy={busy} onStatus={(status) => perform(async () => await supabase.from('modules').update({ status }).eq('id', module.id), status === 'published' ? 'Week published for entitled learners.' : `Week moved to ${status}.`)} onGetLessonAnswer={getLessonAnswer} onSaveLesson={(sessionId, draft) => saveLesson(module.id, sessionId, draft)}/>)}</div>
          {selectedCourse && !selectedCourseModules.length && <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">This course has no weeks yet.</p>}
        </>}

        {view === 'instructors' && <>
          <section><h2 className="text-2xl font-extrabold">Instructor assignments</h2><p className="mt-1 text-sm text-stone-600">Choose an existing account to promote or assign to this course. Instructors can then draft lessons and review submissions for their assigned courses.</p></section>
          <label className="block max-w-xl text-xs font-semibold text-stone-600">Course<select className={`${inputClass} mt-1`} value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
          <form onSubmit={assignInstructor} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:flex-row"><select required className={inputClass} value={selectedInstructor} onChange={(event) => setSelectedInstructor(event.target.value)}><option value="">Choose a learner or instructor</option>{people.filter((person) => person.role !== 'admin').map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.role} · {person.id.slice(0, 6)}</option>)}</select><button disabled={busy || !selectedCourse} className={`${buttonClass} shrink-0`}><Users className="h-4 w-4"/>Promote and assign</button></form>
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Assigned to {selectedCourseRow?.title ?? 'course'}</h3><div className="mt-3 divide-y divide-stone-100">{courseInstructors.filter((assignment) => assignment.course_id === selectedCourse).map((assignment) => { const person = people.find((item) => item.id === assignment.instructor_id); return <div key={assignment.instructor_id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{person?.full_name ?? 'Instructor'}</p><p className="text-xs text-stone-500">Instructor · {assignment.instructor_id.slice(0, 8)}…</p></div><button disabled={busy} onClick={() => void removeInstructor(assignment.course_id, assignment.instructor_id)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">Remove course assignment</button></div>})}{!courseInstructors.some((assignment) => assignment.course_id === selectedCourse) && <p className="py-3 text-sm text-stone-500">No instructors are assigned to this course yet.</p>}</div></section>
        </>}

        {view === 'hero' && <>
          <section><h2 className="text-2xl font-extrabold">Landing hero background</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">Upload a wide image for the public home page. The image is layered behind a dark readability overlay; adjust image visibility while checking that the headline stays easy to read.</p></section>
          <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold">Upload a background image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => { void uploadHeroImage(event.target.files?.[0]); event.currentTarget.value = '' }} className="mt-2 block w-full rounded-xl border border-stone-300 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:font-semibold file:text-white"/><span className="mt-1 block text-xs font-normal text-stone-500">JPG, PNG, WebP, or AVIF; maximum 5 MB.</span></label>
            {heroSettings.hero_image_url ? <div className="relative isolate min-h-56 overflow-hidden rounded-2xl bg-slate-950 p-6 text-white"><div aria-hidden="true" className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url("${heroSettings.hero_image_url}")`, opacity: heroSettings.hero_image_opacity / 100 }}/><div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-950/65"/><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Live preview</p><h3 className="mt-3 text-2xl font-black">Your Modern Python Online School</h3><p className="mt-2 max-w-lg text-sm text-slate-100">A preview of the public hero text over your selected background.</p></div> : <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">No hero image uploaded. The landing page uses its original background.</div>}
            <label className="block text-sm font-semibold">Image visibility: {heroSettings.hero_image_opacity}%<input type="range" min="0" max="100" step="5" value={heroSettings.hero_image_opacity} onChange={(event) => setHeroSettings((current) => ({ ...current, hero_image_opacity: Number(event.target.value) }))} className="mt-3 block w-full accent-emerald-700"/><span className="mt-1 block text-xs font-normal text-stone-500">Lower visibility makes the image fainter. Text contrast protection remains in place.</span></label>
            <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void saveHeroOpacity()} className={buttonClass}>Save image visibility</button>{heroSettings.hero_image_url && <button disabled={busy} onClick={() => void removeHeroImage()} className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Remove image</button>}</div>
          </section>
        </>}

        {view === 'admissions' && <>
          <section><h2 className="text-2xl font-extrabold">Admission document</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">Edit the learner guide here. Saving keeps a private draft. Publishing creates an immutable version. Mark only a major change when learners must accept it again; price-only changes do not require re-acceptance.</p></section>
          {admissionDocument && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">Current published version: {admissionDocument.version} · {new Date(admissionDocument.published_at).toLocaleString()} · {admissionDocument.requires_reacceptance ? 'Major update' : 'No re-acceptance required'}</p>}
          <form onSubmit={(event) => { event.preventDefault(); void saveAdmissionDraft() }} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold">Document title<input required minLength={5} maxLength={160} className={`${inputClass} mt-1`} value={admissionDraft.title} onChange={(event) => setAdmissionDraft((current) => ({ ...current, title: event.target.value }))}/></label>
            <label className="block text-sm font-semibold">Document content (plain text with Markdown headings and lists)<textarea required minLength={100} maxLength={30000} rows={24} className={`${inputClass} mt-1 font-mono text-xs leading-5`} value={admissionDraft.content_markdown} onChange={(event) => setAdmissionDraft((current) => ({ ...current, content_markdown: event.target.value }))}/></label>
            <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><input type="checkbox" checked={admissionMajorChange} onChange={(event) => setAdmissionMajorChange(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700"/><span>This is a major change. Learners and under-18 guardians must review and accept this version again.</span></label>
            <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void saveAdmissionDraft()} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold">Save draft</button><button type="button" disabled={busy} onClick={() => void publishAdmissionDocument()} className={buttonClass}>Publish new version</button></div>
          </form>
        </>}

        {view === 'payments' && <>
          <section><h2 className="text-2xl font-extrabold">Manual Paybill payments</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">Review each learner’s receipt suffix and payer phone against the M-Pesa message you received. Confirming grants the selected access; declining keeps the record and shares your reason.</p></section>
          {paymentSettings && <>
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div><h3 className="font-bold">Accept new payment requests</h3><p className="mt-1 text-xs text-stone-500">Paybill {paymentSettings.paybill_number} · Account {paymentSettings.account_number}</p><p className="mt-1 text-xs text-stone-500">Turning this off blocks new requests but keeps pending reviews and confirmed access.</p></div><button disabled={busy} onClick={() => void perform(async () => await supabase.from('payment_settings').update({ payments_enabled: !paymentSettings.payments_enabled, updated_at: new Date().toISOString() }).eq('id', true), paymentSettings.payments_enabled ? 'New payment requests are disabled.' : 'New payment requests are enabled.')} className={`${buttonClass} ${paymentSettings.payments_enabled ? 'bg-rose-700 hover:bg-rose-800' : ''}`}>{paymentSettings.payments_enabled ? 'Disable payments' : 'Enable payments'}</button><span className={`rounded-full px-3 py-1 text-xs font-bold ${paymentSettings.payments_enabled ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'}`}>{paymentSettings.payments_enabled ? 'Enabled' : 'Disabled'}</span></section>
            <section className="grid gap-3 md:grid-cols-2">
              <PlanToggle title="Monthly access" description="Enable only when the next paid month has published lessons. The database checks availability when a learner submits." enabled={paymentSettings.monthly_payments_enabled} busy={busy} onClick={() => void perform(async () => await supabase.from('payment_settings').update({ monthly_payments_enabled: !paymentSettings.monthly_payments_enabled, updated_at: new Date().toISOString() }).eq('id', true), paymentSettings.monthly_payments_enabled ? 'Monthly access requests disabled.' : 'Monthly access requests enabled.')}/>
              <PlanToggle title="Full-course access" description="Enable only after all paid months are published. The database checks published course content before it accepts a request." enabled={paymentSettings.full_course_payments_enabled} busy={busy} onClick={() => void perform(async () => await supabase.from('payment_settings').update({ full_course_payments_enabled: !paymentSettings.full_course_payments_enabled, updated_at: new Date().toISOString() }).eq('id', true), paymentSettings.full_course_payments_enabled ? 'Full-course requests disabled.' : 'Full-course requests enabled.')}/>
            </section>
            {paymentPricingDraft && <form onSubmit={savePaymentPricing} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div><h3 className="font-bold">Public and learner prices</h3><p className="mt-1 text-xs leading-5 text-stone-600">Set prices in KSh. USD is calculated from the daily CBK indicative rate and rounded to the nearest dollar. KSh is used for Paybill requests. Full-course savings are calculated from the regular price minus the sale price.</p></div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4"><div><p className="text-sm font-semibold">Daily USD/KSh exchange rate</p><p className="mt-1 text-xs text-stone-600">{paymentSettings?.usd_kes_rate && paymentSettings.usd_kes_rate_date ? `1 USD = KSh ${Number(paymentSettings.usd_kes_rate).toFixed(4)} · Rate date ${paymentSettings.usd_kes_rate_date} · ${paymentSettings.usd_kes_rate_source ?? 'CBK indicative rate'}` : 'No CBK rate has been saved yet. USD displays will update after the first successful refresh.'}</p><p className="mt-1 text-xs text-stone-500">The daily Vercel schedule refreshes automatically. If the source is unavailable, the last saved rate stays active.</p></div><button type="button" disabled={busy} onClick={() => void refreshExchangeRate()} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-white disabled:opacity-50"><RefreshCw className="mr-2 inline h-4 w-4"/>Refresh rate now</button></div>
              <div className="grid gap-5 md:grid-cols-2">
                {(['KES', 'USD'] as const).map((currency) => {
                  const keys = currency === 'KES'
                    ? { monthly: 'monthly_amount_kes', sale: 'full_course_amount_kes', regular: 'full_course_regular_amount_kes' } as const
                    : { monthly: 'monthly_amount_usd', sale: 'full_course_amount_usd', regular: 'full_course_regular_amount_usd' } as const
                  const symbol = currency === 'KES' ? 'KSh' : '$'
                  const step = '1'
                  const kesValue = (key: 'monthly_amount_kes' | 'full_course_amount_kes' | 'full_course_regular_amount_kes') => Number(paymentPricingDraft[key])
                  const usdValue = (key: 'monthly_amount_kes' | 'full_course_amount_kes' | 'full_course_regular_amount_kes', fallback: 'monthly_amount_usd' | 'full_course_amount_usd' | 'full_course_regular_amount_usd') => paymentSettings?.usd_kes_rate ? Math.round(kesValue(key) / Number(paymentSettings.usd_kes_rate)) : Number(paymentPricingDraft[fallback])
                  const values = currency === 'KES'
                    ? { monthly: kesValue('monthly_amount_kes'), sale: kesValue('full_course_amount_kes'), regular: kesValue('full_course_regular_amount_kes') }
                    : { monthly: usdValue('monthly_amount_kes', 'monthly_amount_usd'), sale: usdValue('full_course_amount_kes', 'full_course_amount_usd'), regular: usdValue('full_course_regular_amount_kes', 'full_course_regular_amount_usd') }
                  const usdReadOnly = currency === 'USD'
                  return <fieldset key={currency} className="space-y-3 rounded-xl border border-stone-200 p-4"><legend className="px-1 text-sm font-bold">{currency === 'KES' ? 'Kenyan shillings (M-Pesa currency)' : 'US dollars (display only)'}</legend>
                    <label className="block text-xs font-semibold">Monthly price ({symbol})<input type="number" min="1" step={step} required readOnly={usdReadOnly} className={`${inputClass} mt-1 ${usdReadOnly ? 'bg-stone-100' : ''}`} value={values.monthly} onChange={(event) => setPaymentPricingDraft((current) => current ? { ...current, [keys.monthly]: Number(event.target.value) } : current)}/></label>
                    <label className="block text-xs font-semibold">Full-course sale price ({symbol})<input type="number" min="1" step={step} required readOnly={usdReadOnly} className={`${inputClass} mt-1 ${usdReadOnly ? 'bg-stone-100' : ''}`} value={values.sale} onChange={(event) => setPaymentPricingDraft((current) => current ? { ...current, [keys.sale]: Number(event.target.value) } : current)}/></label>
                    <label className="block text-xs font-semibold">Full-course regular price ({symbol})<input type="number" min="1" step={step} required readOnly={usdReadOnly} className={`${inputClass} mt-1 ${usdReadOnly ? 'bg-stone-100' : ''}`} value={values.regular} onChange={(event) => setPaymentPricingDraft((current) => current ? { ...current, [keys.regular]: Number(event.target.value) } : current)}/></label>
                    <p className="text-xs text-stone-500">Displayed saving: {symbol} {Math.max(0, values.regular - values.sale).toLocaleString(currency === 'KES' ? 'en-KE' : 'en-US')}</p>
                  </fieldset>
                })}
              </div>
              <button disabled={busy} className={buttonClass}>Save prices</button>
            </form>}
          </>}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Payment review queue</h3><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{paymentRequests.filter((request) => request.status === 'pending').length} pending</span></div><div className="mt-3 divide-y divide-stone-100">{paymentRequests.map((request) => <article key={request.id} className="py-4 first:pt-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{people.find((person) => person.id === request.student_id)?.full_name ?? 'Learner'} · {courses.find((course) => course.id === request.course_id)?.title ?? 'Course'}</p><p className="mt-1 text-xs text-stone-600">{request.purchase_type === 'full_course' ? 'Full course' : `Month ${request.target_month}`} · KSh {request.amount_kes.toLocaleString()} · Receipt …{request.receipt_suffix} · Payer {request.payer_phone}</p><p className="mt-1 text-xs text-stone-500">Submitted {new Date(request.created_at).toLocaleString()} · {request.status}</p></div>{request.status === 'pending' && <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void reviewPayment(request.id, 'confirmed')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm payment</button></div>}</div>{request.status === 'pending' && <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Decline reason for learner" maxLength={500} value={declineReasons[request.id] ?? ''} onChange={(event) => setDeclineReasons((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Reason to show the learner if declined" className="min-w-64 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs"/><button disabled={busy || !(declineReasons[request.id] ?? '').trim()} onClick={() => void reviewPayment(request.id, 'declined')} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">Decline with reason</button></div>}{request.status === 'declined' && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-900">Declined: {request.decline_reason}</p>}</article>)}{paymentRequests.length === 0 && <p className="py-5 text-sm text-stone-500">No payment requests yet. When payments are enabled, learner requests will appear here.</p>}</div></section>
        </>}
      </main>
    </div>
  </div>
}

function CourseCard({ course, moduleCount, busy, onSave }: { course: Course; moduleCount: number; busy: boolean; onSave: (patch: Partial<Course>) => Promise<void> }) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description)
  const [slug, setSlug] = useState(course.slug)
  const [language, setLanguage] = useState(course.language_code)
  return <article className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2">
    <div className="flex items-center justify-between gap-3 md:col-span-2"><div><p className="text-xs text-stone-500">{moduleCount} weeks · {course.slug}</p><h3 className="font-bold">{course.title}</h3></div><select aria-label={`Status for ${course.title}`} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold" value={course.status} onChange={(event) => void onSave({ status: event.target.value as Course['status'] })} disabled={busy}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
    <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Course title"/><input className={inputClass} value={slug} onChange={(event) => setSlug(event.target.value)} aria-label="Course slug"/><input className={inputClass} value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Language code"/><input className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Course description"/><button disabled={busy || (title === course.title && description === course.description && slug === course.slug && language === course.language_code)} className={`${buttonClass} md:col-span-2`} onClick={() => void onSave({ title, description, slug, language_code: language })}>Save course details</button>
  </article>
}

function ModuleCard({ module, sessions, busy, onStatus, onGetLessonAnswer, onSaveLesson }: { module: Module; sessions: Session[]; busy: boolean; onStatus: (status: Module['status']) => Promise<boolean>; onGetLessonAnswer: (sessionId: number) => Promise<LessonAnswer | null>; onSaveLesson: (sessionId: number | null, draft: LessonDraft) => Promise<boolean> }) {
  const [expanded, setExpanded] = useState(false)
  const [editorTarget, setEditorTarget] = useState<{ session?: Session; answer?: LessonAnswer } | null | false>(false)
  const nextSessionNumber = Array.from({ length: 20 }, (_, index) => index + 1).find((number) => !sessions.some((session) => session.session_number === number)) ?? 1
  const editing = editorTarget && typeof editorTarget === 'object' ? editorTarget : undefined
  return <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Month {module.month_number} · {module.tagline || `Week ${module.order_index}`}</p><h3 className="mt-1 font-bold">{module.title}</h3><p className="mt-1 text-xs text-stone-500">{sessions.length} lessons · {module.is_free ? 'Free month' : 'Paid course'}</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => setExpanded((value) => !value)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">{expanded ? 'Hide lesson list' : 'Review lessons'}</button><select aria-label={`Publication status for ${module.title}`} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold" value={module.status} onChange={(event) => void onStatus(event.target.value as Module['status'])} disabled={busy}><option value="draft">Draft · learners cannot see</option><option value="published">Published to entitled learners</option><option value="archived">Archived</option></select></div></div>{expanded && <div className="border-t border-stone-100 bg-stone-50/70 px-5 py-3"><div className="mb-3 flex justify-end"><button onClick={() => setEditorTarget(null)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5"/>Add lesson</button></div>{sessions.length ? sessions.map((session) => <div key={session.id} className="border-b border-stone-200 py-3 last:border-0"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold"><span className="mr-2 font-mono text-stone-500">S{session.session_number}</span>{session.title}</span><div className="flex shrink-0 items-center gap-3"><span className="text-xs text-stone-500">{session.xp_reward} XP</span><button onClick={async () => { const answer = await onGetLessonAnswer(session.id); if (answer) setEditorTarget({ session, answer }) }} className="text-xs font-semibold text-emerald-800 underline">Edit</button></div></div><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-stone-600">Preview lesson content</summary><div className="mt-2 space-y-2 rounded-lg bg-white p-3 text-xs leading-5 text-stone-700"><p><strong>Everyday analogy:</strong> {session.analogy_physical}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans">{session.content_markdown}</pre><p><strong>Quick check:</strong> {session.quick_check?.question}</p></div></details></div>) : <p className="py-2 text-sm text-stone-500">No lesson sessions have been added to this week yet.</p>}{editorTarget !== false && <LessonEditor key={editing?.session?.id ?? `new-${nextSessionNumber}`} session={editing?.session} answer={editing?.answer} nextSessionNumber={nextSessionNumber} busy={busy} onCancel={() => setEditorTarget(false)} onSave={async (draft) => { const ok = await onSaveLesson(editing?.session?.id ?? null, draft); if (ok) setEditorTarget(false); return ok }}/>}</div>}</article>
}

function LessonEditor({ session, answer, nextSessionNumber, busy, onCancel, onSave }: { session?: Session; answer?: LessonAnswer; nextSessionNumber: number; busy: boolean; onCancel: () => void; onSave: (draft: LessonDraft) => Promise<boolean> }) {
  const initialOptions = session?.quick_check?.options ?? ['', '', '']
  const [draft, setDraft] = useState<LessonDraft>({
    session_number: session?.session_number ?? nextSessionNumber,
    title: session?.title ?? '',
    analogy: session?.analogy_physical ?? '',
    content: session?.content_markdown ?? '',
    starterCode: session?.starter_code ?? '# Write your Python code here\n',
    hints: session?.hints ?? [],
    xp: session?.xp_reward ?? 50,
    duration: session?.duration_minutes ?? 15,
    question: session?.quick_check?.question ?? '',
    options: [...initialOptions],
    correctOption: answer?.correctOption ?? 0,
    explanation: answer?.explanation ?? '',
  })
  const set = (patch: Partial<LessonDraft>) => setDraft((current) => ({ ...current, ...patch }))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave({ ...draft, options: draft.options.map((option) => option.trim()).filter(Boolean) })
  }
  return <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between"><h4 className="font-bold">{session ? 'Edit lesson' : 'Create lesson'}</h4><button type="button" onClick={onCancel} className="text-xs font-semibold text-stone-500 underline">Cancel</button></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Lesson number<input required type="number" min="1" max="20" className={`${inputClass} mt-1`} value={draft.session_number} onChange={(event) => set({ session_number: Number(event.target.value) })}/></label><label className="text-xs font-semibold">Duration in minutes<input required type="number" min="5" max="60" className={`${inputClass} mt-1`} value={draft.duration} onChange={(event) => set({ duration: Number(event.target.value) })}/></label></div>
    <label className="block text-xs font-semibold">Lesson title<input required maxLength={160} className={`${inputClass} mt-1`} value={draft.title} onChange={(event) => set({ title: event.target.value })}/></label>
    <label className="block text-xs font-semibold">Everyday analogy<textarea required maxLength={2000} rows={2} className={`${inputClass} mt-1`} value={draft.analogy} onChange={(event) => set({ analogy: event.target.value })}/></label>
    <label className="block text-xs font-semibold">Lesson text (simple Markdown)<textarea required maxLength={30000} rows={10} className={`${inputClass} mt-1 font-mono`} value={draft.content} onChange={(event) => set({ content: event.target.value })}/></label>
    <label className="block text-xs font-semibold">Starter code<textarea rows={5} className={`${inputClass} mt-1 font-mono`} value={draft.starterCode} onChange={(event) => set({ starterCode: event.target.value })}/></label>
    <label className="block text-xs font-semibold">Hints (one per line)<textarea rows={3} className={`${inputClass} mt-1`} value={draft.hints.join('\n')} onChange={(event) => set({ hints: event.target.value.split('\n').map((hint) => hint.trim()).filter(Boolean) })}/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">XP reward<input type="number" min="0" max="1000" className={`${inputClass} mt-1`} value={draft.xp} onChange={(event) => set({ xp: Number(event.target.value) })}/></label><label className="text-xs font-semibold">Quick-check question<input required maxLength={1000} className={`${inputClass} mt-1`} value={draft.question} onChange={(event) => set({ question: event.target.value })}/></label></div>
    <div className="grid gap-3 sm:grid-cols-3">{draft.options.map((option, index) => <label key={index} className="text-xs font-semibold">Answer {String.fromCharCode(65 + index)}<input required maxLength={500} className={`${inputClass} mt-1`} value={option} onChange={(event) => set({ options: draft.options.map((value, optionIndex) => optionIndex === index ? event.target.value : value) })}/></label>)}</div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Correct answer<select className={`${inputClass} mt-1`} value={draft.correctOption} onChange={(event) => set({ correctOption: Number(event.target.value) })}>{draft.options.map((option, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}{option ? ` · ${option}` : ''}</option>)}</select></label><label className="text-xs font-semibold">Explain why it is correct<input required maxLength={2000} className={`${inputClass} mt-1`} value={draft.explanation} onChange={(event) => set({ explanation: event.target.value })}/></label></div>
    <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950">The correct answer and explanation are saved in a private database table. Learners receive the explanation after they submit an answer.</p>
    <button disabled={busy} className={buttonClass}>{busy ? 'Saving…' : session ? 'Save lesson changes' : 'Create lesson'}</button>
  </form>
}

function PlanToggle({ title, description, enabled, busy, onClick }: { title: string; description: string; enabled: boolean; busy: boolean; onClick: () => void }) {
  return <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="min-w-0 flex-1"><h3 className="font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-stone-500">{description}</p><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'}`}>{enabled ? 'Enabled' : 'Disabled'}</span></div><button disabled={busy} onClick={onClick} className={`${buttonClass} ${enabled ? 'bg-rose-700 hover:bg-rose-800' : ''}`}>{enabled ? 'Disable option' : 'Enable option'}</button></section>
}
