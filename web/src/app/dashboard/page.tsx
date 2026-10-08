"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ChevronRight, Clock, Flame, Lock, Play, Sparkles, Zap } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import AccountMenu from '@/components/account/AccountMenu'
import { visibleStreak } from '@/lib/learning-streak'
import { createClient } from '@/lib/supabase/client'

type ModuleRow = {
  id: number
  month_number: number
  title: string
  tagline: string | null
  is_free: boolean
  order_index: number
}

type SessionRow = {
  id: number
  module_id: number
  session_number: number
  title: string
  order_index: number
  duration_minutes: number
}

type LessonProgress = { session_id: number; completed: boolean; completed_at: string | null }

export default function DashboardPage() {
  const [student, setStudent] = useState({ xp: 0, streak: 0, role: 'student' })
  const [courseTitle, setCourseTitle] = useState('Python Foundations')
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      const supabase = createClient()
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          window.location.assign('/login')
          return
        }

        const [{ data: profile, error: profileError }, { data: course, error: courseError }] = await Promise.all([
          supabase.from('profiles').select('full_name,xp,streak_count,last_activity_date,role').eq('id', user.id).maybeSingle(),
          supabase.from('courses').select('id,title').eq('slug', 'python-foundations').eq('status', 'published').maybeSingle(),
        ])
        if (profileError) throw profileError
        if (courseError) throw courseError
        if (!course) throw new Error('The Python Foundations course is not published yet.')

        const { data: enrollment, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('id,plan,status,started_at,paid_through')
          .eq('course_id', course.id)
          .eq('student_id', user.id)
          .maybeSingle()
        if (enrollmentError) throw enrollmentError
        if (!enrollment) throw new Error('Your account is not enrolled in this course yet.')

        const { data: visibleModules, error: modulesError } = await supabase
          .from('modules')
          .select('id,month_number,title,tagline,is_free,order_index')
          .eq('course_id', course.id)
          .eq('status', 'published')
          .order('order_index')
        if (modulesError) throw modulesError
        const moduleRows = (visibleModules ?? []) as ModuleRow[]
        const moduleIds = moduleRows.map((module) => module.id)

        const [sessionResult, progressResult] = await Promise.all([
          moduleIds.length
            ? supabase.from('sessions').select('id,module_id,session_number,title,order_index,duration_minutes').in('module_id', moduleIds).order('order_index')
            : Promise.resolve({ data: [], error: null }),
          supabase.from('user_progress').select('session_id,completed,completed_at').eq('student_id', user.id),
        ])
        if (sessionResult.error) throw sessionResult.error
        if (progressResult.error) throw progressResult.error
        if (!active) return

        setStudent({
          xp: profile?.xp ?? 0,
          streak: visibleStreak(profile?.streak_count ?? 0, profile?.last_activity_date ?? null),
          role: profile?.role ?? 'student',
        })
        setCourseTitle(course.title)
        setModules(moduleRows)
        setSessions((sessionResult.data ?? []) as SessionRow[])
        setProgress((progressResult.data ?? []) as LessonProgress[])
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'We could not load your learning data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadDashboard()
    return () => { active = false }
  }, [])

  const completedIds = useMemo(() => new Set(progress.filter((item) => item.completed).map((item) => item.session_id)), [progress])
  const orderedSessions = useMemo(() => {
    const monthOrder = new Map(modules.map((module) => [module.id, module.order_index]))
    return [...sessions].sort((a, b) =>
      (monthOrder.get(a.module_id) ?? 0) - (monthOrder.get(b.module_id) ?? 0) || a.order_index - b.order_index,
    )
  }, [modules, sessions])
  const focusSession = orderedSessions.find((session) => !completedIds.has(session.id)) ?? orderedSessions.at(-1) ?? null
  const progressThisWeek = progress.filter((item) => {
    if (!item.completed) return false
    if (!item.completed_at) return false
    const date = new Date(item.completed_at)
    const monday = new Date()
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    return date >= monday
  }).length

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-slate-900/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🐍</span>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">PyLearn <span className="text-emerald-400">Pro</span></span>
            <span className="-mt-1 block text-[10px] text-slate-400">Student Learning Academy</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          {student.role === 'admin' && <Link href="/admin" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-700 hover:bg-emerald-500/20">Admin panel</Link>}
          {student.role === 'instructor' && <Link href="/instructor" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-700 hover:bg-emerald-500/20">Instructor workspace</Link>}
          <ThemeToggle />
          <div className="hidden items-center gap-1.5 rounded-xl border border-white/5 bg-slate-800 px-3 py-1.5 text-amber-300 sm:flex">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>{student.streak > 0 ? `${student.streak} day streak` : 'Streaks are optional'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-800 px-3 py-1.5 text-purple-300">
            <Zap className="h-4 w-4 text-purple-400" />
            <span>{student.xp} XP</span>
          </div>
          <AccountMenu dark />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-10">
        {loadError && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">{loadError}</div>
        )}
        {loading ? (
          <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/60 p-8 text-sm text-slate-300" role="status">Loading your course and progress…</div>
        ) : !loadError && (
          <>
            <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-slate-900/80 to-cyan-500/10 p-8">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" /> Continue learning
                </div>
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{focusSession?.title ?? `Welcome to ${courseTitle}`}</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {focusSession ? 'Pick up with a short lesson. Your weekly goal is five sessions, and your progress is saved as you complete each quick check.' : 'Your course lessons are being prepared. They will appear here when published.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {focusSession && <Link href={`/classroom/${focusSession.id}`} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300">
                    <Play className="h-4 w-4 fill-current" /> Continue session <ChevronRight className="h-4 w-4" />
                  </Link>}
                  <span className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-xs text-slate-300">This week: {Math.min(progressThisWeek, 5)} of 5 sessions</span>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Your Python learning path</h2>
                  <p className="mt-1 text-xs text-slate-400">Lessons and completion are loaded from your account.</p>
                </div>
                {modules.length > 0 && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">{modules.length} published module{modules.length === 1 ? '' : 's'}</span>}
              </div>

              {modules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-500/40 p-6 text-sm text-slate-400">No lessons are currently available to this account. If you just enrolled, refresh the page in a moment.</div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {modules.map((module) => {
                    const moduleSessions = orderedSessions.filter((session) => session.module_id === module.id)
                    const completedCount = moduleSessions.filter((session) => completedIds.has(session.id)).length
                    const percent = moduleSessions.length ? Math.round(completedCount / moduleSessions.length * 100) : 0
                    return (
                      <article key={module.id} className="rounded-2xl border border-emerald-500/25 bg-slate-900/60 p-6">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Month {module.month_number} • {module.tagline ?? `${moduleSessions.length} sessions`}</span>
                          <span className="rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-400">Available</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{module.title}</h3>
                        <div className="my-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percent}%` }} /></div>
                        <p className="mb-4 text-xs text-slate-400">{completedCount} of {moduleSessions.length} sessions complete</p>
                        <div className="space-y-2">
                          {moduleSessions.map((session, sessionIndex) => {
                            const done = completedIds.has(session.id)
                            const firstIncomplete = moduleSessions.findIndex((item) => !completedIds.has(item.id))
                            const unlocked = done || firstIncomplete < 0 || sessionIndex <= firstIncomplete
                            const rowClass = `flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2.5 text-xs ${unlocked ? 'transition hover:border-emerald-500/30 hover:bg-slate-900' : 'cursor-not-allowed opacity-50'}`
                            const rowContent = <>
                              <span className="flex min-w-0 items-center gap-2">
                                {done ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" /> : unlocked ? <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-500 text-[9px] text-slate-400">{session.session_number}</span> : <Lock className="h-4 w-4 shrink-0 text-slate-500"/>}
                                <span className={done ? 'truncate text-slate-400' : 'truncate font-medium text-slate-200'}>{session.title}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1 text-slate-400"><Clock className="h-3.5 w-3.5" />{session.duration_minutes}m</span>
                            </>
                            return unlocked
                              ? <Link key={session.id} href={`/classroom/${session.id}`} className={rowClass}>{rowContent}</Link>
                              : <div key={session.id} aria-disabled="true" title="Complete the previous lesson first" className={rowClass}>{rowContent}</div>
                          })}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
            <p className="text-center text-xs text-slate-500">Your work stays yours. You can learn at your own pace; streaks are optional.</p>
          </>
        )}
      </main>
    </div>
  )
}
