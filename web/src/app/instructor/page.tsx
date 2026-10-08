"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { BookOpen, ClipboardCheck, LoaderCircle, LockKeyhole, Plus, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/theme/ThemeToggle'
import AccountMenu from '@/components/account/AccountMenu'

type Course = { id: string; title: string }
type Week = { id: number; course_id: string; month_number: number; title: string; description: string | null; tagline: string | null; is_free: boolean; order_index: number; status: 'draft' | 'published' | 'archived' }
type Lesson = { id: number; module_id: number; session_number: number; title: string; analogy_physical: string; content_markdown: string; starter_code: string; hints: string[]; xp_reward: number; duration_minutes: number; quick_check: { question?: string; options?: string[] } }
type Submission = { id: string; student_id: string; assignment_id: number; submitted_code: string; tests_passed: number; total_tests: number; score: number; passed: boolean; submitted_at: string }
type Assignment = { id: number; session_id: number; title: string; instructions_markdown: string }
type Profile = { id: string; full_name: string }
type LessonForm = { session_number: number; title: string; analogy: string; content: string; starter: string; hints: string; xp: number; duration: number; question: string; options: string[]; correct: number; explanation: string }

const field = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15'
const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50'
const blankLesson = (number: number): LessonForm => ({ session_number: number, title: '', analogy: '', content: '', starter: '# Write your Python code here\n', hints: '', xp: 50, duration: 15, question: '', options: ['', '', ''], correct: 0, explanation: '' })

export default function InstructorPage() {
  const supabase = useMemo(() => createClient(), [])
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const [tab, setTab] = useState<'submissions' | 'content'>('submissions')
  const [courses, setCourses] = useState<Course[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [courseId, setCourseId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [weekTitle, setWeekTitle] = useState('')
  const [weekMonth, setWeekMonth] = useState('1')
  const [weekNumber, setWeekNumber] = useState('1')
  const [weekDescription, setWeekDescription] = useState('')
  const [lessonWeek, setLessonWeek] = useState('')
  const [lessonForm, setLessonForm] = useState<LessonForm | null>(null)
  const [lessonRecordId, setLessonRecordId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setError('')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { window.location.assign('/login'); return }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError) throw profileError
    if (profile?.role !== 'instructor') { setAccess('denied'); return }
    const { data: links, error: linkError } = await supabase.from('course_instructors').select('course_id').eq('instructor_id', user.id)
    if (linkError) throw linkError
    const ids = (links ?? []).map((link) => link.course_id as string)
    const [courseResult, weekResult] = await Promise.all([
      ids.length ? supabase.from('courses').select('id,title').in('id', ids).order('title') : Promise.resolve({ data: [], error: null }),
      ids.length ? supabase.from('modules').select('id,course_id,month_number,title,description,tagline,is_free,order_index,status').in('course_id', ids).order('month_number').order('order_index') : Promise.resolve({ data: [], error: null }),
    ])
    if (courseResult.error) throw courseResult.error
    if (weekResult.error) throw weekResult.error
    const courseRows = (courseResult.data ?? []) as Course[]
    const weekRows = (weekResult.data ?? []) as Week[]
    setCourses(courseRows); setWeeks(weekRows)
    setCourseId((current) => courseRows.some((item) => item.id === current) ? current : courseRows[0]?.id ?? '')
    const moduleIds = weekRows.map((week) => week.id)
    const lessonResult = moduleIds.length ? await supabase.from('sessions').select('id,module_id,session_number,title,analogy_physical,content_markdown,starter_code,hints,xp_reward,duration_minutes,quick_check').in('module_id', moduleIds).order('session_number') : { data: [], error: null }
    if (lessonResult.error) throw lessonResult.error
    const lessonRows = (lessonResult.data ?? []) as Lesson[]
    setLessons(lessonRows)
    const lessonIds = lessonRows.map((lesson) => lesson.id)
    const assignmentResult = lessonIds.length ? await supabase.from('assignments').select('id,session_id,title,instructions_markdown').in('session_id', lessonIds) : { data: [], error: null }
    if (assignmentResult.error) throw assignmentResult.error
    const assignmentRows = (assignmentResult.data ?? []) as Assignment[]
    setAssignments(assignmentRows)
    const assignmentIds = assignmentRows.map((assignment) => assignment.id)
    const submissionResult = assignmentIds.length ? await supabase.from('submissions').select('id,student_id,assignment_id,submitted_code,tests_passed,total_tests,score,passed,submitted_at').in('assignment_id', assignmentIds).order('submitted_at', { ascending: false }) : { data: [], error: null }
    if (submissionResult.error) throw submissionResult.error
    const submissionRows = (submissionResult.data ?? []) as Submission[]
    setSubmissions(submissionRows)
    const learnerIds = [...new Set(submissionRows.map((row) => row.student_id))]
    const peopleResult = learnerIds.length ? await supabase.from('profiles').select('id,full_name').in('id', learnerIds) : { data: [], error: null }
    if (peopleResult.error) throw peopleResult.error
    setProfiles((peopleResult.data ?? []) as Profile[])
    setAccess('allowed')
  }, [supabase])

  useEffect(() => { void load().catch((reason) => { setError(reason instanceof Error ? reason.message : 'We could not load the instructor workspace.'); setAccess('denied') }) }, [load])

  async function run(action: () => Promise<{ error: { message: string } | null }>, success: string): Promise<boolean> {
    setBusy(true); setError(''); setNotice('')
    try { const result = await action(); if (result.error) throw new Error(result.error.message); setNotice(success); await load(); return true }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The change could not be saved.'); return false }
    finally { setBusy(false) }
  }

  async function createWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const month = Number(weekMonth); const number = Number(weekNumber)
    if (!courseId || !weekTitle.trim()) return
    await run(async () => await supabase.from('modules').insert({ course_id: courseId, month_number: month, order_index: number, title: weekTitle.trim(), tagline: `Week ${number} · Sessions ${(number - 1) * 5 + 1}–${number * 5}`, description: weekDescription.trim(), is_free: month === 1, status: 'draft' }), 'Draft week created. An administrator must review and publish it.')
    setWeekTitle(''); setWeekDescription('')
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!lessonForm || !lessonWeek) return
    const draft = lessonForm
    const result = await run(async () => await supabase.rpc('instructor_save_lesson', { p_session_id: lessonRecordId, p_module_id: Number(lessonWeek), p_session_number: draft.session_number, p_title: draft.title, p_analogy: draft.analogy, p_content_markdown: draft.content, p_starter_code: draft.starter, p_hints: draft.hints.split('\n').map((hint) => hint.trim()).filter(Boolean), p_xp_reward: draft.xp, p_duration_minutes: draft.duration, p_question: draft.question, p_options: draft.options.map((value) => value.trim()).filter(Boolean), p_correct_option: draft.correct, p_explanation: draft.explanation }), 'Draft lesson saved with its private quick-check answer. It is not published yet.')
    if (result) { setLessonForm(null); setLessonRecordId(null) }
  }

  const selectedWeeks = weeks.filter((week) => week.course_id === courseId)
  if (access === 'loading') return <main className="grid min-h-screen place-items-center bg-[#faf7f0] text-stone-700"><p className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin"/> Checking instructor access…</p></main>
  if (access === 'denied') return <main className="grid min-h-screen place-items-center bg-[#faf7f0] p-6 text-stone-800"><section className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 text-center"><LockKeyhole className="mx-auto mb-3 h-8 w-8 text-amber-700"/><h1 className="text-xl font-bold">Instructor access required</h1><p className="mt-2 text-sm leading-6 text-stone-600">An administrator must assign your account to a course before you can review work or draft lessons.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-left text-xs text-rose-800">{error}</p>}<Link className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white" href="/dashboard">Back to dashboard</Link></section></main>

  return <div className="instructor-console min-h-screen bg-[#faf7f0] text-stone-900">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><ShieldCheck className="h-5 w-5"/></div><div><h1 className="font-extrabold">PyLearn Pro <span className="text-emerald-700">Instructor</span></h1><p className="text-xs text-stone-500">Assigned courses and learner submissions</p></div></div><div className="flex items-center gap-2"><ThemeToggle/><Link href="/dashboard" className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold">Dashboard</Link><AccountMenu/></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 md:px-8">
      <section><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Instructor workspace</p><h2 className="mt-1 text-2xl font-extrabold">Support learners and prepare lessons</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">You can review submissions for your assigned courses and prepare draft lessons. Learner code drafts stay private. An administrator reviews and publishes course content.</p></section>
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {!courses.length ? <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">No courses are assigned to your instructor account yet. Ask an administrator to assign a course.</div> : <>
        <label className="block max-w-xl text-xs font-semibold text-stone-600">Assigned course<select className={`${field} mt-1`} value={courseId} onChange={(event) => { setCourseId(event.target.value); setLessonForm(null) }}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <div className="flex gap-2 border-b border-stone-200"><button onClick={() => setTab('submissions')} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'submissions' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500'}`}><ClipboardCheck className="h-4 w-4"/>Review submissions</button><button onClick={() => setTab('content')} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'content' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500'}`}><BookOpen className="h-4 w-4"/>Draft content</button></div>
        {tab === 'submissions' && <div className="space-y-3">{(() => { const assignmentIds = new Set(assignments.filter((assignment) => lessons.some((lesson) => lesson.id === assignment.session_id && selectedWeeks.some((week) => week.id === lesson.module_id))).map((assignment) => assignment.id)); const rows = submissions.filter((submission) => assignmentIds.has(submission.assignment_id)); return rows.length ? rows.map((submission) => { const assignment = assignments.find((item) => item.id === submission.assignment_id); const lesson = lessons.find((item) => item.id === assignment?.session_id); return <article key={submission.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-stone-500">{profiles.find((person) => person.id === submission.student_id)?.full_name ?? 'Learner'} · {lesson?.title ?? assignment?.title}</p><h3 className="mt-1 font-bold">{assignment?.title ?? 'Assignment submission'}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${submission.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{submission.passed ? 'Passed' : 'Needs review'} · {submission.score}%</span></div><p className="mt-2 text-xs text-stone-500">{submission.tests_passed}/{submission.total_tests} checks passed · {new Date(submission.submitted_at).toLocaleString()}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-emerald-800">View submitted code</summary><pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-stone-950 p-4 text-xs leading-5 text-stone-100"><code>{submission.submitted_code}</code></pre></details></article> }) : <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">No assignment submissions are available for this course yet.</div> })()}</div>}
        {tab === 'content' && <div className="space-y-5">
          <form onSubmit={createWeek} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2"><h3 className="font-bold md:col-span-2">Start a draft week</h3><select className={field} value={weekMonth} onChange={(event) => setWeekMonth(event.target.value)}>{[1,2,3,4].map((value) => <option key={value} value={value}>Month {value}</option>)}</select><select className={field} value={weekNumber} onChange={(event) => setWeekNumber(event.target.value)}>{[1,2,3,4].map((value) => <option key={value} value={value}>Week {value}</option>)}</select><input required className={field} placeholder="Week title" value={weekTitle} onChange={(event) => setWeekTitle(event.target.value)}/><input className={field} placeholder="Learning goal" value={weekDescription} onChange={(event) => setWeekDescription(event.target.value)}/><button disabled={busy} className={button}><Plus className="h-4 w-4"/>Create draft week</button></form>
          <div className="grid gap-3">{selectedWeeks.map((week) => { const rows = lessons.filter((lesson) => lesson.module_id === week.id); const editable = week.status === 'draft'; return <article key={week.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Month {week.month_number} · {week.tagline ?? `Week ${week.order_index}`}</p><h3 className="mt-1 font-bold">{week.title}</h3><p className="mt-1 text-xs text-stone-500">{rows.length} lessons · {week.status === 'draft' ? 'Draft; learners cannot see it' : `Read only · ${week.status}`}</p></div>{editable && <button onClick={() => { setLessonWeek(String(week.id)); setLessonRecordId(null); const next = Array.from({ length: 20 }, (_, index) => index + 1).find((number) => !rows.some((lesson) => lesson.session_number === number)) ?? 1; setLessonForm(blankLesson(next)) }} className={button}><Plus className="h-4 w-4"/>Add lesson</button>}</div><div className="mt-4 divide-y divide-stone-100">{rows.map((lesson) => <details key={lesson.id} className="py-3"><summary className="cursor-pointer text-sm font-semibold">Lesson {lesson.session_number}: {lesson.title}</summary><div className="mt-3 space-y-2 text-sm leading-6 text-stone-700"><p><b>Analogy:</b> {lesson.analogy_physical}</p><pre className="whitespace-pre-wrap font-sans">{lesson.content_markdown}</pre><p><b>Quick check:</b> {lesson.quick_check?.question}</p>{editable && <button className="text-xs font-semibold text-emerald-800 underline" onClick={async () => { setError(''); const { data, error: keyError } = await supabase.rpc('admin_get_lesson_key', { p_session_id: lesson.id }); if (keyError) { setError(keyError.message); return }; const answer = data as { correct_option: number; explanation: string }; setLessonWeek(String(week.id)); setLessonRecordId(lesson.id); setLessonForm({ session_number: lesson.session_number, title: lesson.title, analogy: lesson.analogy_physical, content: lesson.content_markdown, starter: lesson.starter_code, hints: (lesson.hints ?? []).join('\n'), xp: lesson.xp_reward, duration: lesson.duration_minutes, question: lesson.quick_check?.question ?? '', options: lesson.quick_check?.options ?? ['', ''], correct: answer.correct_option, explanation: answer.explanation }) }}>Edit draft lesson</button>}</div></details>)}{!rows.length && <p className="py-3 text-sm text-stone-500">No lessons yet. Add the first lesson to this draft week.</p>}</div></article> })}</div>
          {lessonForm && <form onSubmit={saveLesson} className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold">{lessonRecordId ? 'Edit draft lesson' : 'Create lesson draft'}</h3><button type="button" className="text-xs underline" onClick={() => { setLessonForm(null); setLessonRecordId(null) }}>Cancel</button></div><select required className={field} value={lessonWeek} onChange={(event) => setLessonWeek(event.target.value)}>{selectedWeeks.filter((week) => week.status === 'draft').map((week) => <option key={week.id} value={week.id}>{week.title}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Lesson number<input type="number" min="1" max="20" required className={`${field} mt-1`} value={lessonForm.session_number} onChange={(event) => setLessonForm({ ...lessonForm, session_number: Number(event.target.value) })}/></label><label className="text-xs font-semibold">Duration (minutes)<input type="number" min="5" max="60" required className={`${field} mt-1`} value={lessonForm.duration} onChange={(event) => setLessonForm({ ...lessonForm, duration: Number(event.target.value) })}/></label></div><input required maxLength={160} className={field} placeholder="Lesson title" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}/><textarea required maxLength={2000} rows={2} className={field} placeholder="Everyday analogy" value={lessonForm.analogy} onChange={(event) => setLessonForm({ ...lessonForm, analogy: event.target.value })}/><textarea required maxLength={30000} rows={8} className={`${field} font-mono`} placeholder="Lesson explanation (simple Markdown)" value={lessonForm.content} onChange={(event) => setLessonForm({ ...lessonForm, content: event.target.value })}/><textarea rows={4} className={`${field} font-mono`} placeholder="Starter code" value={lessonForm.starter} onChange={(event) => setLessonForm({ ...lessonForm, starter: event.target.value })}/><textarea rows={3} className={field} placeholder="Hints (one per line)" value={lessonForm.hints} onChange={(event) => setLessonForm({ ...lessonForm, hints: event.target.value })}/><input required maxLength={1000} className={field} placeholder="Quick-check question" value={lessonForm.question} onChange={(event) => setLessonForm({ ...lessonForm, question: event.target.value })}/><div className="grid gap-3 sm:grid-cols-3">{lessonForm.options.map((value, index) => <input key={index} required maxLength={500} className={field} placeholder={`Answer ${String.fromCharCode(65 + index)}`} value={value} onChange={(event) => setLessonForm({ ...lessonForm, options: lessonForm.options.map((option, i) => i === index ? event.target.value : option) })}/>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Correct answer<select className={`${field} mt-1`} value={lessonForm.correct} onChange={(event) => setLessonForm({ ...lessonForm, correct: Number(event.target.value) })}>{lessonForm.options.map((value, index) => <option key={index} value={index}>Answer {String.fromCharCode(65 + index)}{value ? ` · ${value}` : ''}</option>)}</select></label><input required maxLength={2000} className={field} placeholder="Explain why the answer is correct" value={lessonForm.explanation} onChange={(event) => setLessonForm({ ...lessonForm, explanation: event.target.value })}/></div><p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">The answer key is private. Saving does not publish the lesson; an administrator reviews it.</p><button disabled={busy} className={button}>{busy ? 'Saving…' : lessonRecordId ? 'Save lesson changes' : 'Save lesson draft'}</button></form>}
        </div>}
      </>}
    </main>
  </div>
}
