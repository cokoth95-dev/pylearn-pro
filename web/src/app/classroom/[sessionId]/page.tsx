"use client"

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { usePyodide } from '@/lib/usePyodide'
import MemoryVisualizer from '@/components/classroom/MemoryVisualizer'
import AIChatMentor from '@/components/classroom/AIChatMentor'
import ThemeToggle from '@/components/theme/ThemeToggle'
import AccountMenu from '@/components/account/AccountMenu'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, Layers, Play, RotateCcw, Send, Sparkles, Terminal } from 'lucide-react'

type Lesson = {
  id: number
  module_id: number
  session_number: number
  title: string
  order_index: number
  duration_minutes: number
  analogy_physical: string
  content_markdown: string
  starter_code: string
  hints: string[] | null
  quick_check: { question?: string; options?: string[] }
  modules: { id: number; title: string; month_number: number; course_id: string; status: string }
}
type QuickCheckAttempt = { selected_option: number; correct: boolean; attempted_at: string }
type QuickCheckResult = { correct: boolean; explanation: string; session_completed_now: boolean; xp_awarded: number }
type Tab = 'terminal' | 'visualizer' | 'ai'

function inlineText(text: string) {
  const chunks = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return chunks.map((chunk, index) => {
    if (chunk.startsWith('`') && chunk.endsWith('`')) return <code key={index} className="rounded bg-amber-100 px-1 py-0.5 font-mono text-amber-950">{chunk.slice(1, -1)}</code>
    if (chunk.startsWith('**') && chunk.endsWith('**')) return <strong key={index}>{chunk.slice(2, -2)}</strong>
    return chunk
  })
}

function explainPythonError(traceback: string) {
  const lastLine = traceback.trim().split('\n').filter(Boolean).at(-1) ?? 'Python could not run this code.'
  if (lastLine.startsWith('SyntaxError') || lastLine.startsWith('IndentationError')) return 'Python could not read the code. Check the spelling, quotes, brackets, colon, and indentation.'
  if (lastLine.startsWith('NameError')) return 'Python cannot find a name in your code. Check the spelling and make sure the variable or function is defined before it is used.'
  if (lastLine.startsWith('TypeError')) return 'These values do not work together in this operation. Check their types; typed answers often need int(...) before math.'
  if (lastLine.startsWith('ValueError')) return 'Python could not turn this answer into the requested value. Check that the typed answer matches the question, such as digits for a whole number.'
  if (lastLine.startsWith('ZeroDivisionError')) return 'The program tried to divide by zero. Check the number used as the divisor.'
  return `Python stopped with an error: ${lastLine}`
}

// Render the small, known Markdown subset used by lesson content as React text.
// Raw HTML is never interpreted, so edited course text cannot inject markup.
function LessonText({ source }: { source: string }) {
  const lines = source.split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }
    if (line.startsWith('```')) {
      index++
      const code: string[] = []
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++])
      index++
      blocks.push(<pre key={`code-${index}`} className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-900 p-4 text-sm leading-6 text-stone-100"><code>{code.join('\n')}</code></pre>)
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const content = inlineText(heading[2])
      const Tag = heading[1].length === 1 ? 'h2' : heading[1].length === 2 ? 'h3' : 'h4'
      blocks.push(<Tag key={`h-${index}`} className="pt-2 text-lg font-bold text-stone-900">{content}</Tag>)
      index++
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) items.push(<li key={index}>{inlineText(lines[index++].replace(/^[-*]\s+/, ''))}</li>)
      blocks.push(<ul key={`list-${index}`} className="list-disc space-y-1 pl-5">{items}</ul>)
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) items.push(<li key={index}>{inlineText(lines[index++].replace(/^\d+\.\s+/, ''))}</li>)
      blocks.push(<ol key={`olist-${index}`} className="list-decimal space-y-1 pl-5">{items}</ol>)
      continue
    }
    const paragraph: string[] = []
    while (index < lines.length && lines[index].trim() && !/^#{1,3}\s|^```|^[-*]\s|^\d+\.\s/.test(lines[index])) paragraph.push(lines[index++])
    blocks.push(<p key={`p-${index}`}>{inlineText(paragraph.join(' '))}</p>)
  }
  return <div className="space-y-3 text-sm leading-7 text-stone-700">{blocks}</div>
}

function ClassroomContent() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = Number(params.sessionId)
  const { isReady, isLoading: isPyodideLoading, runPython } = usePyodide()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [nextLessonId, setNextLessonId] = useState<number | null>(null)
  const [code, setCode] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [terminalOutput, setTerminalOutput] = useState('Run your Python code here. Browser practice does not submit a grade.')
  const [terminalError, setTerminalError] = useState('')
  const [fullTraceback, setFullTraceback] = useState('')
  const [inputValues, setInputValues] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [tab, setTab] = useState<Tab>('terminal')
  const [attempts, setAttempts] = useState<QuickCheckAttempt[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [checkResult, setCheckResult] = useState<QuickCheckResult | null>(null)
  const [isSubmittingCheck, setIsSubmittingCheck] = useState(false)
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [secondsSpent, setSecondsSpent] = useState(0)
  const [savedSecondsSpent, setSavedSecondsSpent] = useState(0)
  const [showTraceback, setShowTraceback] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) { setLoadError('This lesson link is not valid.'); setLoading(false); return }
    setLoading(true); setLoadError('')
    let active = true
    async function loadLesson() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { window.location.assign('/login'); return }
        const { data, error } = await supabase.from('sessions')
          .select('id,module_id,session_number,title,order_index,duration_minutes,analogy_physical,content_markdown,starter_code,hints,quick_check,modules!inner(id,title,month_number,course_id,status)')
          .eq('id', sessionId).maybeSingle()
        if (error) throw error
        if (!data) throw new Error('This lesson is not available to your account. Check your course access or return to the dashboard.')
        const loaded = data as unknown as Lesson
        const { data: progressRow, error: progressError } = await supabase.from('user_progress')
          .select('draft_code,completed,timer_seconds_spent').eq('student_id', user.id).eq('session_id', sessionId).maybeSingle()
        if (progressError) throw progressError
        const { data: history, error: historyError } = await supabase.from('session_quick_check_attempts')
          .select('selected_option,correct,attempted_at').eq('student_id', user.id).eq('session_id', sessionId).order('attempted_at')
        if (historyError) throw historyError
        const { data: courseSessions, error: sessionsError } = await supabase.from('sessions')
          .select('id,session_number').eq('module_id', loaded.module_id).order('session_number')
        if (sessionsError) throw sessionsError
        const currentIndex = (courseSessions ?? []).findIndex((item) => item.id === sessionId)
        if (!active) return
        setLesson(loaded)
        const draft = progressRow?.draft_code ?? loaded.starter_code ?? ''
        setCode(draft); setSavedCode(draft); setSaveState('saved')
        setSecondsSpent(progressRow?.timer_seconds_spent ?? 0)
        setSavedSecondsSpent(progressRow?.timer_seconds_spent ?? 0)
        setAttempts((history ?? []) as QuickCheckAttempt[])
        const lastCorrect = [...((history ?? []) as QuickCheckAttempt[])].reverse().find((attempt) => attempt.correct)
        if (lastCorrect) setCheckResult({ correct: true, explanation: 'You already passed this quick check. Your completion is saved.', session_completed_now: false, xp_awarded: 0 })
        setNextLessonId(currentIndex >= 0 ? courseSessions?.[currentIndex + 1]?.id ?? null : null)
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'We could not load this lesson.')
      } finally { if (active) setLoading(false) }
    }
    void loadLesson()
    return () => { active = false }
  }, [sessionId, supabase])

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsSpent((seconds) => seconds + 60), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!lesson || saveState === 'loading' || (code === savedCode && secondsSpent === savedSecondsSpent)) return
    setSaveState('saving')
    const timer = window.setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveState('error'); return }
      const { error } = await supabase.from('user_progress').upsert({
        student_id: user.id, session_id: lesson.id, draft_code: code,
        timer_seconds_spent: secondsSpent, last_accessed: new Date().toISOString(),
      }, { onConflict: 'student_id,session_id' })
      if (error) setSaveState('error')
      else { setSavedCode(code); setSavedSecondsSpent(secondsSpent); setSaveState('saved') }
    }, code === savedCode ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [code, lesson, savedCode, savedSecondsSpent, saveState, secondsSpent, supabase])

  const handleRunCode = useCallback(async () => {
    setIsExecuting(true); setShowTraceback(false); setTab('terminal')
    setTerminalError(''); setFullTraceback(''); setTerminalOutput('Running Python in this browser…')
    const result = await runPython(code, inputValues.split('\n').filter((value) => value.length > 0))
    setFullTraceback(result.stderr)
    setTerminalError(result.stderr ? explainPythonError(result.stderr) : '')
    setTerminalOutput(result.stdout || (result.stderr ? '' : 'Your program finished without showing output.'))
    setIsExecuting(false)
  }, [code, inputValues, runPython])

  async function submitQuickCheck() {
    if (!lesson || selectedOption === null || isSubmittingCheck) return
    setIsSubmittingCheck(true); setCheckResult(null)
    const { data, error } = await supabase.rpc('submit_session_quick_check', {
      p_session_id: lesson.id, p_selected_option: selectedOption,
    })
    if (error) {
      setCheckResult({ correct: false, explanation: error.message, session_completed_now: false, xp_awarded: 0 })
    } else {
      const result = data as QuickCheckResult
      setCheckResult(result)
      setAttempts((current) => [...current, { selected_option: selectedOption, correct: result.correct, attempted_at: new Date().toISOString() }])
    }
    setIsSubmittingCheck(false)
  }

  const checkOptions = lesson?.quick_check?.options ?? []
  const latestAttempt = attempts.at(-1)
  const completed = Boolean(checkResult?.correct || attempts.some((attempt) => attempt.correct))

  if (loading) return <main className="min-h-screen p-8 text-center text-stone-700">Loading your lesson…</main>
  if (loadError || !lesson) return <main className="mx-auto min-h-screen max-w-2xl p-8 text-stone-800"><p role="alert" className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4">{loadError || 'Lesson unavailable.'}</p><Link className="underline" href="/dashboard">Back to Dashboard</Link></main>

  return <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-100">
    <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-4 py-2 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" className="flex shrink-0 items-center gap-1 text-xs text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4"/> Dashboard</Link><div className="hidden h-5 border-l border-white/20 sm:block"/><div className="min-w-0"><div className="truncate text-sm font-bold text-white">{lesson.title}</div><div className="text-[11px] text-slate-400">Month {lesson.modules.month_number} · Session {lesson.session_number} · {lesson.duration_minutes} minutes</div></div></div>
      <div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">{saveState === 'saving' ? 'Saving draft…' : saveState === 'error' ? 'Draft not saved' : 'Draft saved'}</span><ThemeToggle/><AccountMenu dark/><button onClick={() => setCode(lesson.starter_code || '')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><RotateCcw className="mr-1 inline h-3.5 w-3.5"/>Reset</button><button onClick={handleRunCode} disabled={!isReady || isExecuting} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"><Play className="mr-1 inline h-3.5 w-3.5"/>{isPyodideLoading ? 'Loading Python…' : isExecuting ? 'Running…' : 'Run code'}</button></div>
    </header>

    <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(280px,0.95fr)_minmax(360px,1.1fr)_minmax(300px,0.95fr)] lg:p-5">
      <section className="min-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/40 p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-200"><BookOpen className="h-4 w-4 text-emerald-400"/> Lesson guide</div>
        <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-100/70 p-4 text-sm leading-6 text-stone-800"><div className="mb-1 font-bold">Everyday example</div>{lesson.analogy_physical}</div>
        <LessonText source={lesson.content_markdown}/>
        {lesson.hints?.length ? <details className="mt-5 rounded-xl border border-stone-200 bg-white/70 p-4 text-sm text-stone-700"><summary className="cursor-pointer font-semibold">Hints if you need help</summary><ul className="mt-3 list-disc space-y-2 pl-5">{lesson.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ul></details> : null}
      </section>

      <section className="flex min-h-[55vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 text-xs text-slate-300"><span>Python practice editor</span><span className="text-emerald-300">Browser practice · no grade saved</span></div>
        <div className="min-h-[340px] flex-1"><Editor height="100%" defaultLanguage="python" theme="vs-dark" value={code} onChange={(value) => setCode(value ?? '')} options={{fontSize:14,fontFamily:"'Fira Code', monospace",minimap:{enabled:false},scrollBeyondLastLine:false,automaticLayout:true,tabSize:4,lineNumbers:'on',padding:{top:14,bottom:14}}}/></div>
        <label className="border-t border-white/10 bg-slate-900/70 p-3 text-xs text-slate-300">Program inputs <span className="text-slate-500">(one answer per line, in the order Python asks)</span><textarea value={inputValues} onChange={(event) => setInputValues(event.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 p-2 font-mono text-xs text-slate-100" placeholder={'For example, for two input() questions:\nAmina\n12'}/></label>
      </section>

      <section className="flex min-h-[55vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="flex border-b border-white/10 bg-slate-900/80 text-xs">{([['terminal',Terminal,'Output'],['visualizer',Layers,'Memory'],['ai',Sparkles,'Ask for help']] as const).map(([id, Icon, label]) => <button key={id} onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-3 font-semibold ${tab === id ? 'border-b-2 border-emerald-400 text-emerald-300' : 'text-slate-400'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>
        <div className="flex-1 overflow-auto p-3">
          {tab === 'terminal' && <>{terminalError && <div className="mb-2 rounded-xl border border-amber-300/30 bg-amber-100 p-3 text-sm text-amber-950" role="status"><strong className="block">Let’s fix this</strong>{terminalError}<div><button className="mt-1 underline" onClick={() => setShowTraceback((value) => !value)}>{showTraceback ? 'Hide full traceback' : 'Show full traceback'}</button></div>{showTraceback && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap border-t border-amber-300 pt-2 font-mono text-xs">{fullTraceback}</pre>}</div>}<pre className="max-h-56 min-h-32 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">{terminalOutput}</pre>
            <div className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-50 p-4 text-stone-900"><div className="font-bold">Quick check · {attempts.length} attempt{attempts.length === 1 ? '' : 's'}</div><p className="mt-2 text-sm">{lesson.quick_check?.question ?? 'No quick check is available for this lesson.'}</p><div className="mt-3 space-y-2">{checkOptions.map((option, index) => <button key={index} disabled={completed || isSubmittingCheck} onClick={() => setSelectedOption(index)} className={`block w-full rounded-lg border p-2.5 text-left text-sm disabled:cursor-not-allowed ${selectedOption === index ? 'border-emerald-700 bg-emerald-100' : 'border-stone-300 bg-white hover:bg-stone-50'}`}><span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{option}</button>)}</div>
              {checkResult && <div role="status" className={`mt-3 rounded-lg p-3 text-sm ${checkResult.correct ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}`}>{checkResult.correct ? 'Correct — lesson complete. ' : 'Not quite. Try again. '}{checkResult.explanation}{checkResult.xp_awarded > 0 ? ` You earned ${checkResult.xp_awarded} XP.` : ''}</div>}
              {latestAttempt && !checkResult?.correct && <p className="mt-2 text-xs text-stone-600">Your attempts are saved. There is no penalty for trying again.</p>}
              <button disabled={selectedOption === null || completed || isSubmittingCheck || !checkOptions.length} onClick={submitQuickCheck} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{isSubmittingCheck ? 'Checking…' : 'Submit answer'} <Send className="ml-1 inline h-3.5 w-3.5"/></button>
              {completed && nextLessonId && <Link href={`/classroom/${nextLessonId}`} className="ml-3 inline-flex items-center rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-900">Next lesson <ChevronRight className="h-4 w-4"/></Link>}{completed && !nextLessonId && <Link href="/dashboard" className="ml-3 inline-flex items-center rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-900">Week complete <CheckCircle2 className="ml-1 h-4 w-4"/></Link>}
            </div>
            <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3"/>Time in this lesson: {Math.floor(secondsSpent / 60)} min</p>
          </>}
          {tab === 'visualizer' && <MemoryVisualizer code={code} stdout={terminalOutput}/>}
          {tab === 'ai' && <AIChatMentor currentCode={code} sessionTitle={lesson.title}/>}
        </div>
      </section>
    </main>
  </div>
}

export default function ClassroomPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#090d16] p-8 text-center text-slate-200">Loading classroom…</main>}>
      <ClassroomContent />
    </Suspense>
  )
}
