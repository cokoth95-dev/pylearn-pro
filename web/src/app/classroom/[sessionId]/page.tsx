"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { usePyodide } from '@/lib/usePyodide'
import MemoryVisualizer from '@/components/classroom/MemoryVisualizer'
import AIChatMentor from '@/components/classroom/AIChatMentor'
import ThemeToggle from '@/components/theme/ThemeToggle'
import AccountMenu from '@/components/account/AccountMenu'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, FileCode2, Keyboard, Layers, Maximize2, Minimize2, Play, RotateCcw, Send, Sparkles, Terminal } from 'lucide-react'

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
  quick_check: { question?: string; options?: string[]; questions?: Array<{ question: string; options: string[] }> }
  modules: { id: number; title: string; month_number: number; order_index: number; course_id: string; status: string }
}
type PracticeFile = { sessionId: number; title: string; monthNumber: number; weekNumber: number; sessionNumber: number }
type QuickCheckAttempt = { question_number: number; selected_option: number; correct: boolean; attempted_at: string }
type QuizRoundAnswer = { question_number: number; selected_option: number; correct: boolean; explanation: string }
type QuizRoundResult = { round_id: string; score: number; question_count: number; best_score: number; latest_score: number; completed_now: boolean; mastered_questions: number[]; answers: QuizRoundAnswer[] }
type SavedQuizRound = { id: string; score: number; question_count: number; submitted_at: string }
type CodeVersion = { id: string; name: string; code: string; created_at: string }
type DraftConflict = { cloudCode: string; cloudVersion: string | null }
type Tab = 'inputHelp' | 'terminal' | 'visualizer' | 'ai'

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
  if (lastLine.startsWith('EOFError')) return 'You cancelled an input question. Run the code again and answer the browser prompt to continue.'
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
  return <ClassroomLesson key={sessionId} sessionId={sessionId}/>
}

function ClassroomLesson({ sessionId }: { sessionId: number }) {
  const router = useRouter()
  const { isReady, isLoading: isPyodideLoading, runPython } = usePyodide()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [practiceFiles, setPracticeFiles] = useState<PracticeFile[]>([])
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([])
  const [versionName, setVersionName] = useState('')
  const [isSavingVersion, setIsSavingVersion] = useState(false)
  const [nextLessonId, setNextLessonId] = useState<number | null>(null)
  const [code, setCode] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const [expectedDraftVersion, setExpectedDraftVersion] = useState<string | null>(null)
  const [draftConflict, setDraftConflict] = useState<DraftConflict | null>(null)
  const [draftSyncError, setDraftSyncError] = useState('')
  const isValidSessionId = Number.isSafeInteger(sessionId) && sessionId >= 1
  const [loadError, setLoadError] = useState(isValidSessionId ? '' : 'This lesson link is not valid.')
  const [loading, setLoading] = useState(isValidSessionId)
  const [terminalOutput, setTerminalOutput] = useState('Run your Python code here. Browser practice does not submit a grade.')
  const [terminalError, setTerminalError] = useState('')
  const [fullTraceback, setFullTraceback] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [tab, setTab] = useState<Tab>('inputHelp')
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false)
  const [isHelpFullscreen, setIsHelpFullscreen] = useState(false)
  const [wrapEditorLines, setWrapEditorLines] = useState(false)
  const [attempts, setAttempts] = useState<QuickCheckAttempt[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const [roundResult, setRoundResult] = useState<QuizRoundResult | null>(null)
  const [roundHistory, setRoundHistory] = useState<SavedQuizRound[]>([])
  const [roundError, setRoundError] = useState('')
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [isSubmittingCheck, setIsSubmittingCheck] = useState(false)
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [secondsSpent, setSecondsSpent] = useState(0)
  const [savedSecondsSpent, setSavedSecondsSpent] = useState(0)
  const [onlineTick, setOnlineTick] = useState(0)
  const [showTraceback, setShowTraceback] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const editorHostRef = useRef<HTMLDivElement | null>(null)
  const editorPanelRef = useRef<HTMLElementTagNameMap['section'] | null>(null)
  const helpPanelRef = useRef<HTMLElementTagNameMap['section'] | null>(null)
  const editorRef = useRef<{ layout: () => void; setValue: (value: string) => void } | null>(null)
  const localDraftKeyRef = useRef('')

  const handleEditorMount = useCallback((editor: { layout: () => void; setValue: (value: string) => void }) => {
    editorRef.current = editor
    editor.layout()
    requestAnimationFrame(() => editor.layout())
  }, [])

  const handleEditorChange = useCallback((value: string | undefined) => {
    setCode(value ?? '')
  }, [])

  const editorOptions = useMemo(() => ({
    fontSize: 14,
    fontFamily: "Consolas, 'Courier New', monospace",
    fontLigatures: false,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    scrollBeyondLastColumn: 8,
    automaticLayout: true,
    tabSize: 4,
    lineNumbers: 'on' as const,
    lineNumbersMinChars: 3,
    padding: { top: 14, bottom: 14 },
    cursorStyle: 'line' as const,
    cursorBlinking: 'blink' as const,
    cursorWidth: 2,
    readOnly: false,
    renderLineHighlight: 'all' as const,
    mouseStyle: 'text' as const,
    glyphMargin: false,
    wordWrap: (wrapEditorLines ? 'on' : 'off') as 'on' | 'off',
  }), [wrapEditorLines])

  const toggleEditorFullscreen = useCallback(async () => {
    const panel = editorPanelRef.current
    if (!panel) return
    try {
      if (document.fullscreenElement === panel) await document.exitFullscreen()
      else await panel.requestFullscreen()
    } catch {
      // Keep the regular editor available if the browser blocks fullscreen.
    }
  }, [])

  const toggleHelpFullscreen = useCallback(async () => {
    const panel = helpPanelRef.current
    if (!panel) return
    try {
      if (document.fullscreenElement === panel) await document.exitFullscreen()
      else await panel.requestFullscreen()
    } catch {
      // Keep the regular help panel available if the browser blocks fullscreen.
    }
  }, [])

  useEffect(() => {
    const syncFullscreenState = () => setIsEditorFullscreen(document.fullscreenElement === editorPanelRef.current)
    const syncHelpFullscreenState = () => setIsHelpFullscreen(document.fullscreenElement === helpPanelRef.current)
    const syncFullscreen = () => {
      syncFullscreenState()
      syncHelpFullscreenState()
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => editorRef.current?.layout())
  }, [isEditorFullscreen])

  useEffect(() => {
    const host = editorHostRef.current
    if (!host || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => editorRef.current?.layout())
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const markOnline = () => setOnlineTick((tick) => tick + 1)
    window.addEventListener('online', markOnline)
    return () => window.removeEventListener('online', markOnline)
  }, [])

  useEffect(() => {
    if (!isValidSessionId) return
    let active = true
    async function loadLesson() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace('/login'); return }
        const { data, error } = await supabase.from('sessions')
          .select('id,module_id,session_number,title,order_index,duration_minutes,analogy_physical,content_markdown,starter_code,hints,quick_check,modules!inner(id,title,month_number,order_index,course_id,status)')
          .eq('id', sessionId).maybeSingle()
        if (error) throw error
        if (!data) throw new Error('This lesson is not available to your account. Check your course access or return to the dashboard.')
        const loaded = data as unknown as Lesson
        const { data: progressRow, error: progressError } = await supabase.from('user_progress')
          .select('draft_code,draft_updated_at,completed,timer_seconds_spent').eq('student_id', user.id).eq('session_id', sessionId).maybeSingle()
        if (progressError) throw progressError
        const { data: savedVersions, error: versionsError } = await supabase.from('practice_code_versions')
          .select('id,name,code,created_at').eq('student_id', user.id).eq('session_id', sessionId).order('created_at', { ascending: false })
        if (versionsError) throw versionsError
        const { data: history, error: historyError } = await supabase.from('session_quick_check_attempts')
          .select('question_number,selected_option,correct,attempted_at').eq('student_id', user.id).eq('session_id', sessionId).order('attempted_at')
        if (historyError) throw historyError
        const { data: quizRounds, error: roundsError } = await supabase.from('quiz_rounds')
          .select('id,score,question_count,submitted_at').eq('student_id', user.id).eq('session_id', sessionId).order('submitted_at', { ascending: false })
        if (roundsError) throw roundsError
        const { data: courseSessions, error: sessionsError } = await supabase.from('sessions')
          .select('id,session_number').eq('module_id', loaded.module_id).order('session_number')
        if (sessionsError) throw sessionsError
        const { data: modules, error: modulesError } = await supabase.from('modules')
          .select('id,month_number,order_index').eq('course_id', loaded.modules.course_id).eq('status', 'published').order('order_index')
        if (modulesError) throw modulesError
        const moduleRows = modules ?? []
        const moduleIds = moduleRows.map((module) => module.id)
        const { data: allSessions, error: allSessionsError } = moduleIds.length
          ? await supabase.from('sessions').select('id,module_id,session_number,title').in('module_id', moduleIds)
          : { data: [], error: null }
        if (allSessionsError) throw allSessionsError
        const sessionIds = (allSessions ?? []).map((session) => session.id)
        const { data: savedDrafts, error: draftsError } = sessionIds.length
          ? await supabase.from('user_progress').select('session_id,draft_code').eq('student_id', user.id).in('session_id', sessionIds).not('draft_code', 'is', null)
          : { data: [], error: null }
        if (draftsError) throw draftsError
        const modulesById = new Map(moduleRows.map((module) => [module.id, module]))
        const savedSessionIds = new Set((savedDrafts ?? []).map((draft) => draft.session_id))
        const files = (allSessions ?? []).filter((session) => session.id === sessionId || savedSessionIds.has(session.id)).map((session) => {
          const lessonModule = modulesById.get(session.module_id)
          const weekNumber = ((lessonModule?.order_index ?? 1) - 1) % 4 + 1
          return { sessionId: session.id, title: session.title, monthNumber: lessonModule?.month_number ?? 1, weekNumber, sessionNumber: session.session_number }
        }).sort((a, b) => a.monthNumber - b.monthNumber || a.weekNumber - b.weekNumber || a.sessionNumber - b.sessionNumber)
        const currentIndex = (courseSessions ?? []).findIndex((item) => item.id === sessionId)
        if (!active) return
        setLesson(loaded)
        setPracticeFiles(files)
        setCodeVersions((savedVersions ?? []) as CodeVersion[])
        const cloudDraft = progressRow?.draft_code ?? loaded.starter_code ?? ''
        const cloudVersion = progressRow?.draft_updated_at ?? null
        const localKey = `pylearn:practice:${user.id}:${sessionId}`
        localDraftKeyRef.current = localKey
        let localDraft: { code?: string; updatedAt?: string } | null = null
        try { const raw = window.localStorage.getItem(localKey); if (raw) localDraft = JSON.parse(raw) as { code?: string; updatedAt?: string } } catch { localDraft = null }
        const localIsNewer = typeof localDraft?.code === 'string' && localDraft.code !== cloudDraft
          && (!cloudVersion || (localDraft.updatedAt ? Date.parse(localDraft.updatedAt) > Date.parse(cloudVersion) : false))
        const draft = localIsNewer ? localDraft!.code! : cloudDraft
        setCode(draft); setSavedCode(cloudDraft); setExpectedDraftVersion(cloudVersion); setDraftConflict(null); setSaveState('saved')
        setSecondsSpent(progressRow?.timer_seconds_spent ?? 0)
        setSavedSecondsSpent(progressRow?.timer_seconds_spent ?? 0)
        setSelectedOptions({})
        setRoundResult(null)
        setRoundHistory((quizRounds ?? []) as SavedQuizRound[])
        setAttempts((history ?? []) as QuickCheckAttempt[])
        setAlreadyCompleted(Boolean(progressRow?.completed))
        setNextLessonId(currentIndex >= 0 ? courseSessions?.[currentIndex + 1]?.id ?? null : null)
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'We could not load this lesson.')
      } finally { if (active) setLoading(false) }
    }
    void loadLesson()
    return () => { active = false }
  }, [isValidSessionId, router, sessionId, supabase])

  const saveCloudDraft = useCallback(async (draftCode: string, timerSeconds: number, expectedVersion: string | null) => {
    if (!lesson) return false
    setSaveState('saving')
    const { data, error } = await supabase.rpc('save_lesson_draft', {
      p_session_id: lesson.id, p_code: draftCode, p_timer_seconds: timerSeconds, p_expected_version: expectedVersion,
    })
    if (error) { setSaveState('error'); return false }
    const result = data as { status?: string; draft_version?: string | null; cloud_code?: string; cloud_version?: string | null }
    if (result.status === 'conflict') {
      setDraftConflict({ cloudCode: result.cloud_code ?? '', cloudVersion: result.cloud_version ?? null })
      setSaveState('error')
      return false
    }
    setExpectedDraftVersion(result.draft_version ?? null)
    setSavedCode(draftCode); setSavedSecondsSpent(timerSeconds); setSaveState('saved')
    if (localDraftKeyRef.current) {
      try { window.localStorage.setItem(localDraftKeyRef.current, JSON.stringify({ code: draftCode, updatedAt: result.draft_version ?? new Date().toISOString() })) } catch { /* A successful cloud save remains available. */ }
    }
    return true
  }, [lesson, supabase])

  async function resolveDraftConflict(keepBoth: boolean) {
    if (!draftConflict || !lesson) return
    if (keepBoth) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveState('error'); return }
      const { data: version, error: versionError } = await supabase.from('practice_code_versions').insert({
        student_id: user.id, session_id: lesson.id,
        name: `Before sync ${new Date().toLocaleString()}`.slice(0, 60), code,
      }).select('id,name,code,created_at').single()
      if (versionError || !version) { setSaveState('error'); setDraftSyncError('Could not preserve both code versions. Please try again.'); return }
      setCodeVersions((current) => [version as CodeVersion, ...current])
    }
    const saved = await saveCloudDraft(code, secondsSpent, draftConflict.cloudVersion)
    if (saved) setDraftConflict(null)
  }

  function useCloudDraftVersion() {
    if (!draftConflict) return
    editorRef.current?.setValue(draftConflict.cloudCode)
    setCode(draftConflict.cloudCode); setSavedCode(draftConflict.cloudCode)
    setExpectedDraftVersion(draftConflict.cloudVersion); setDraftConflict(null); setSaveState('saved')
    if (localDraftKeyRef.current) {
      try { window.localStorage.setItem(localDraftKeyRef.current, JSON.stringify({ code: draftConflict.cloudCode, updatedAt: draftConflict.cloudVersion ?? new Date().toISOString() })) } catch { /* Browser recovery is optional when storage is blocked. */ }
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setSecondsSpent((seconds) => seconds + 60)
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!lesson || loading || (code === savedCode && secondsSpent === savedSecondsSpent)) return
    const timer = window.setTimeout(async () => {
      await saveCloudDraft(code, secondsSpent, expectedDraftVersion)
    }, code === savedCode ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [code, expectedDraftVersion, lesson, loading, onlineTick, savedCode, savedSecondsSpent, secondsSpent, saveCloudDraft])

  useEffect(() => {
    if (!lesson || loading || !localDraftKeyRef.current) return
    try { window.localStorage.setItem(localDraftKeyRef.current, JSON.stringify({ code, updatedAt: new Date().toISOString() })) } catch { /* Keep the classroom usable if browser storage is full or disabled. */ }
  }, [code, lesson, loading])

  const handleRunCode = useCallback(async () => {
    if (document.fullscreenElement === editorPanelRef.current) await document.exitFullscreen().catch(() => undefined)
    setIsExecuting(true); setShowTraceback(false); setTab('terminal')
    setTerminalError(''); setFullTraceback(''); setTerminalOutput('Running Python in this browser…')
    const result = await runPython(code)
    setFullTraceback(result.stderr)
    setTerminalError(result.stderr ? explainPythonError(result.stderr) : '')
    setTerminalOutput(result.stdout || (result.stderr ? '' : 'Your program finished without showing output.'))
    setIsExecuting(false)
  }, [code, runPython])

  const handleResetCode = useCallback(() => {
    const starterCode = lesson?.starter_code ?? ''
    editorRef.current?.setValue(starterCode)
    setCode(starterCode)
  }, [lesson])

  async function submitQuickCheckRound() {
    if (!lesson || isSubmittingCheck || checkQuestions.some((_, index) => selectedOptions[index + 1] === undefined)) return
    setIsSubmittingCheck(true)
    setRoundError('')
    const answers = checkQuestions.map((_, index) => ({ question_number: index + 1, selected_option: selectedOptions[index + 1] }))
    const { data, error } = await supabase.rpc('submit_quick_check_round', {
      p_session_id: lesson.id, p_answers: answers,
    })
    if (error) {
      setRoundError(`Your quiz round was not saved. ${error.message}`)
    } else {
      const result = data as QuizRoundResult
      setRoundResult(result)
      const now = new Date().toISOString()
      setAttempts((current) => [...current, ...result.answers.map((answer) => ({ question_number: answer.question_number, selected_option: answer.selected_option, correct: answer.correct, attempted_at: now }))])
      setAlreadyCompleted((current) => current || result.mastered_questions.length >= result.question_count)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: updatedRounds } = await supabase.from('quiz_rounds').select('id,score,question_count,submitted_at').eq('student_id', user.id).eq('session_id', lesson.id).order('submitted_at', { ascending: false })
        if (updatedRounds) setRoundHistory(updatedRounds as SavedQuizRound[])
      }
    }
    setIsSubmittingCheck(false)
  }

  async function saveNamedCodeVersion() {
    const cleanName = versionName.trim()
    if (!lesson || !cleanName || isSavingVersion) return
    setIsSavingVersion(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveState('error'); setIsSavingVersion(false); return }
    const { data, error } = await supabase.from('practice_code_versions').insert({ student_id: user.id, session_id: lesson.id, name: cleanName, code })
      .select('id,name,code,created_at').single()
    if (error || !data) setSaveState('error')
    else { setCodeVersions((current) => [data as CodeVersion, ...current]); setVersionName('') }
    setIsSavingVersion(false)
  }

  async function restoreCodeVersion(version: CodeVersion) {
    const restore = window.confirm(`Open “${version.name}” in the editor? Your latest draft remains saved separately.`)
    if (!restore) return
    editorRef.current?.setValue(version.code)
    setCode(version.code)
  }

  async function deleteCodeVersion(versionId: string) {
    const { error } = await supabase.from('practice_code_versions').delete().eq('id', versionId)
    if (error) setSaveState('error')
    else setCodeVersions((current) => current.filter((version) => version.id !== versionId))
  }

  const checkQuestions = lesson?.quick_check?.questions ?? (lesson?.quick_check?.question ? [{ question: lesson.quick_check.question, options: lesson.quick_check.options ?? [] }] : [])
  const correctQuestionNumbers = new Set(attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.question_number))
  const completed = alreadyCompleted || (checkQuestions.length > 0 && correctQuestionNumbers.size >= checkQuestions.length)
  const bestScore = Math.max(0, ...roundHistory.map((round) => round.score))

  if (loading) return <main className="min-h-screen p-8 text-center text-stone-700">Loading your lesson…</main>
  if (loadError || !lesson) return <main className="mx-auto min-h-screen max-w-2xl p-8 text-stone-800"><p role="alert" className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4">{loadError || 'Lesson unavailable.'}</p><Link className="underline" href="/dashboard">Back to Dashboard</Link></main>

  return <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-100">
    <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-4 py-2 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" className="flex shrink-0 items-center gap-1 text-xs text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4"/> Dashboard</Link><div className="hidden h-5 border-l border-white/20 sm:block"/><div className="min-w-0"><div className="truncate text-sm font-bold text-white">{lesson.title}</div><div className="text-[11px] text-slate-400">Month {lesson.modules.month_number} · Week {((lesson.modules.order_index - 1) % 4) + 1} · Session {lesson.session_number} · {lesson.duration_minutes} minutes</div></div></div>
      <div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">{saveState === 'saving' ? 'Saving draft…' : saveState === 'error' ? draftConflict ? 'Draft conflict' : 'Saved on this device · cloud sync pending' : 'Draft saved'}</span><ThemeToggle/><AccountMenu dark/><button onClick={handleResetCode} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200"><RotateCcw className="mr-1 inline h-3.5 w-3.5"/>Reset</button><button onClick={handleRunCode} disabled={!isReady || isExecuting} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"><Play className="mr-1 inline h-3.5 w-3.5"/>{isPyodideLoading ? 'Loading Python…' : isExecuting ? 'Running…' : 'Run code'}</button></div>
    </header>

    <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(280px,0.95fr)_minmax(360px,1.1fr)_minmax(300px,0.95fr)] lg:p-5">
      <section className="min-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/40 p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-200"><BookOpen className="h-4 w-4 text-emerald-400"/> Lesson guide</div>
        <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-100/70 p-4 text-sm leading-6 text-stone-800"><div className="mb-1 font-bold">Everyday example</div>{lesson.analogy_physical}</div>
        <LessonText source={lesson.content_markdown}/>
        {lesson.hints?.length ? <details className="mt-5 rounded-xl border border-stone-200 bg-white/70 p-4 text-sm text-stone-700"><summary className="cursor-pointer font-semibold">Hints if you need help</summary><ul className="mt-3 list-disc space-y-2 pl-5">{lesson.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ul></details> : null}
      </section>

      <section ref={editorPanelRef} className={`flex min-h-[55vh] flex-col overflow-hidden border border-white/10 bg-slate-950 ${isEditorFullscreen ? 'h-dvh w-screen rounded-none p-3' : 'rounded-2xl'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-4 py-3 text-xs text-slate-300"><div className="flex items-center gap-3"><span>Python practice editor</span><span className="text-emerald-300">Browser practice · no grade saved</span></div><div className="flex items-center gap-2">{isEditorFullscreen && <button type="button" onClick={() => void handleRunCode()} disabled={!isReady || isExecuting} className="rounded-md bg-emerald-400 px-2.5 py-1.5 font-bold text-slate-950 disabled:opacity-50"><Play className="mr-1 inline h-3.5 w-3.5"/>{isExecuting ? 'Running…' : 'Run code'}</button>}<button type="button" onClick={() => setWrapEditorLines((value) => !value)} aria-pressed={wrapEditorLines} className="rounded-md border border-white/15 px-2.5 py-1.5 text-slate-200 hover:bg-white/10">{wrapEditorLines ? 'Turn line wrap off' : 'Wrap long lines'}</button><button type="button" onClick={() => void toggleEditorFullscreen()} aria-label={isEditorFullscreen ? 'Exit full screen editor' : 'Open full screen editor'} className="rounded-md border border-white/15 px-2.5 py-1.5 text-slate-200 hover:bg-white/10"><span className="flex items-center gap-1.5">{isEditorFullscreen ? <Minimize2 className="h-3.5 w-3.5"/> : <Maximize2 className="h-3.5 w-3.5"/>}{isEditorFullscreen ? 'Exit full screen' : 'Full screen'}</span></button></div></div>
        {draftConflict && <div role="alert" className="border-b border-amber-300/30 bg-amber-950/70 p-3 text-xs text-amber-100"><p className="font-bold">This lesson’s code changed on another device.</p><p className="mt-1">Choose which copy to keep. You can save both before replacing the cloud draft.</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => void resolveDraftConflict(false)} className="rounded-md bg-amber-200 px-2.5 py-1.5 font-semibold text-amber-950">Keep my current code</button><button type="button" onClick={() => void resolveDraftConflict(true)} className="rounded-md border border-amber-100/40 px-2.5 py-1.5 font-semibold text-amber-50">Keep both versions</button><button type="button" onClick={useCloudDraftVersion} className="rounded-md border border-amber-100/40 px-2.5 py-1.5 font-semibold text-amber-50">Use the cloud copy</button></div></div>}
        {draftSyncError && <p role="alert" className="border-b border-rose-300/30 bg-rose-950/70 p-2 text-xs text-rose-100">{draftSyncError}</p>}
        <nav aria-label="Saved practice files" className="border-b border-white/10 bg-slate-900/70 px-3 py-2">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300"><FileCode2 className="h-3.5 w-3.5 text-emerald-300"/> Your saved practice files <span className="font-normal text-slate-400">· saved automatically for each lesson</span></p>
          {practiceFiles.length ? <div className="flex gap-2 overflow-x-auto pb-1">{practiceFiles.map((file) => {
            const safeTitle = file.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'practice'
            const filename = `month_${file.monthNumber}_week_${file.weekNumber}_session_${file.sessionNumber}_${safeTitle}.py`
            return <Link key={file.sessionId} href={`/classroom/${file.sessionId}`} title={`${file.title} · opens this lesson and restores its saved code`} aria-current={file.sessionId === lesson.id ? 'page' : undefined} onClick={async (event) => {
              if (file.sessionId === lesson.id) return
              event.preventDefault()
              const saved = await saveCloudDraft(code, secondsSpent, expectedDraftVersion)
              if (!saved) return
              router.push(`/classroom/${file.sessionId}`)
            }} className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] ${file.sessionId === lesson.id ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-slate-950 text-slate-300 hover:border-white/30 hover:text-white'}`}><FileCode2 className="h-3.5 w-3.5"/>{filename}</Link>
          })}</div> : <p className="text-[11px] text-slate-400">Your saved files will appear here as you practice.</p>}
        </nav>
        <section aria-label="Named practice versions" className="border-b border-white/10 bg-slate-900/50 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2"><label htmlFor="version-name" className="text-[11px] font-semibold text-slate-300">Save a named version</label><input id="version-name" value={versionName} onChange={(event) => setVersionName(event.target.value)} maxLength={60} placeholder="e.g. first try" className="min-w-28 flex-1 rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder:text-slate-500"/><button type="button" onClick={() => void saveNamedCodeVersion()} disabled={isSavingVersion || !versionName.trim()} className="rounded-md border border-emerald-300/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-40">{isSavingVersion ? 'Saving…' : 'Save version'}</button></div>
          {codeVersions.length > 0 && <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{codeVersions.map((version) => <span key={version.id} className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-[11px]"><button type="button" onClick={() => void restoreCodeVersion(version)} className="text-sky-200 hover:underline" title={`Open code snapshot saved ${new Date(version.created_at).toLocaleString()}`}>{version.name}</button><button type="button" onClick={() => void deleteCodeVersion(version.id)} aria-label={`Delete saved version ${version.name}`} className="px-1 text-slate-500 hover:text-rose-300">×</button></span>)}</div>}
          <p className="mt-1 text-[10px] text-slate-400">Your latest draft saves automatically. Named versions are snapshots you can revisit without losing that draft.</p>
        </section>
        <div ref={editorHostRef} className="min-h-[340px] min-w-0 flex-1">{lesson && !loading && <Editor height="100%" width="100%" defaultLanguage="python" defaultValue={code} theme="vs-dark" onChange={handleEditorChange} onMount={handleEditorMount} options={editorOptions}/>}</div>
      </section>

      <section ref={helpPanelRef} className={`flex min-h-[55vh] flex-col overflow-hidden border border-white/10 bg-slate-950/40 ${isHelpFullscreen ? 'h-dvh w-screen min-h-0 rounded-none border-0' : 'rounded-2xl'}`}>
        <div role="tablist" aria-label="Practice results" className="flex border-b border-white/10 bg-slate-900/80 text-xs">{([['inputHelp',Keyboard,'How input works'],['terminal',Terminal,'Output'],['visualizer',Layers,'Memory'],['ai',Sparkles,'Ask for help']] as const).map(([id, Icon, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-3 font-semibold ${tab === id ? 'border-b-2 border-emerald-400 text-emerald-300' : 'text-slate-400'}`}><Icon className="h-3.5 w-3.5 shrink-0"/><span className="truncate">{label}</span></button>)}</div>
        <div className={`flex-1 ${tab === 'ai' && isHelpFullscreen ? 'min-h-0 overflow-hidden p-0' : 'overflow-auto p-3'}`}>
          {tab === 'inputHelp' && <section role="tabpanel" className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-4"><div><h2 className="font-bold text-slate-100">How <code className="font-mono text-emerald-300">input()</code> works</h2><p className="mt-2 text-sm leading-6 text-slate-300"><code className="font-mono text-emerald-300">input()</code> lets a program ask you a question and use your reply. Click Run code. When Python reaches an <code className="font-mono text-emerald-300">input()</code> line, your browser opens a small dialog showing the question. Type your answer and choose OK. If the program asks another question, a new dialog appears.</p></div><div className="rounded-lg border border-white/10 bg-slate-950 p-3"><p className="text-sm font-semibold text-slate-200">Example</p><pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-5 text-slate-300">{`name = input("What is your name? ")\nprint(f"Hello, {name}!")`}</pre></div><p className="text-sm leading-6 text-slate-300">After you answer, the program continues. Its questions, your replies, and anything it prints appear in the Output tab. The browser dialog is separate from the Output tab. Choosing Cancel stops the program; submitting an empty answer is allowed.</p><p className="text-xs leading-5 text-slate-400">An answer is text, even when you type digits. To use it in a calculation, convert it with <code className="font-mono text-emerald-300">int(input(...))</code>.</p></section>}
          {tab === 'terminal' && <>{terminalError && <div className="mb-2 rounded-xl border border-amber-300/30 bg-amber-100 p-3 text-sm text-amber-950" role="status"><strong className="block">Let’s fix this</strong>{terminalError}<div><button className="mt-1 underline" onClick={() => setShowTraceback((value) => !value)}>{showTraceback ? 'Hide full traceback' : 'Show full traceback'}</button></div>{showTraceback && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap border-t border-amber-300 pt-2 font-mono text-xs">{fullTraceback}</pre>}</div>}<pre className="max-h-56 min-h-32 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">{terminalOutput}</pre>
            <div className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-50 p-4 text-stone-900">
              <div className="font-bold">Quick check · {completed ? 'Mastery complete' : `${correctQuestionNumbers.size} of ${checkQuestions.length} mastered`} · {roundHistory.length} saved round{roundHistory.length === 1 ? '' : 's'}</div>
              {roundHistory[0] && <p className="mt-1 text-xs text-stone-600">Latest saved score: {roundHistory[0].score}/{roundHistory[0].question_count} · Best score: {bestScore}/{roundHistory[0].question_count}</p>}
              {completed && <p className="mt-2 text-sm">You have answered every lesson question correctly at least once. Your progress is saved. You can still try another round for practice.</p>}
              {checkQuestions.length ? <>
                <div className="mt-3 grid gap-3">{checkQuestions.map((question, questionIndex) => {
                  const questionNumber = questionIndex + 1
                  const answerResult = roundResult?.answers.find((answer) => answer.question_number === questionNumber)
                  return <fieldset key={questionNumber} className="rounded-lg border border-emerald-900/10 bg-white p-3"><legend className="px-1 text-xs font-semibold text-stone-600">Question {questionNumber} of {checkQuestions.length}{checkQuestions.length === 4 && questionNumber === 4 ? ' ? Challenge question' : ''}</legend><p className="mt-1 text-sm">{question.question}</p><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${selectedOptions[questionNumber] === optionIndex ? 'border-emerald-700 bg-emerald-50' : 'border-stone-300 bg-white hover:bg-stone-50'} ${answerResult?.selected_option === optionIndex && answerResult.correct ? 'border-emerald-700 bg-emerald-100' : ''}`}><input type="radio" name={`quiz-question-${questionNumber}`} value={optionIndex} checked={selectedOptions[questionNumber] === optionIndex} disabled={Boolean(roundResult) || isSubmittingCheck} onChange={() => setSelectedOptions((current) => ({ ...current, [questionNumber]: optionIndex }))} className="mt-0.5 accent-emerald-700"/><span><span className="mr-1 font-bold">{String.fromCharCode(65 + optionIndex)}.</span>{option}</span></label>)}</div>{answerResult && <p role="status" className={`mt-2 rounded-lg p-2.5 text-sm ${answerResult.correct ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'}`}>{answerResult.correct ? 'Correct. ' : 'Not quite. '}{answerResult.explanation}</p>}</fieldset>
                })}</div>
                {roundError && <p role="alert" className="mt-3 rounded-lg bg-rose-100 p-3 text-sm text-rose-900">{roundError}</p>}
                {roundResult ? <div className="mt-3 rounded-lg border border-emerald-700/20 bg-white p-3 text-sm"><p className="font-bold">This round: {roundResult.score} of {roundResult.question_count}</p><p className="mt-1 text-stone-600">Latest: {roundResult.latest_score}/{roundResult.question_count} ? Best: {Math.max(bestScore, roundResult.best_score)}/{roundResult.question_count}</p><button type="button" onClick={() => { setSelectedOptions({}); setRoundResult(null); setRoundError('') }} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white">Try another round</button></div> : <button disabled={checkQuestions.some((_, index) => selectedOptions[index + 1] === undefined) || isSubmittingCheck} onClick={() => void submitQuickCheckRound()} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{isSubmittingCheck ? 'Saving your round?' : 'Submit all answers'} <Send className="ml-1 inline h-3.5 w-3.5"/></button>}
                <p className="mt-2 text-xs text-stone-600">Answer every question, then submit once. You can retry without a penalty; mastery carries across rounds.</p>
              </> : <p className="mt-2 text-sm">No quick check is available for this lesson.</p>}
              {roundHistory.length > 0 && <details className="mt-3 rounded-lg border border-stone-200 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Saved round history ? {roundHistory.length} round{roundHistory.length === 1 ? '' : 's'}</summary><ul className="mt-2 space-y-1 text-xs text-stone-600">{roundHistory.map((round, index) => <li key={round.id}>Round {roundHistory.length - index}: {round.score}/{round.question_count} ? {new Date(round.submitted_at).toLocaleString()}</li>)}</ul></details>}
              {completed && nextLessonId && <Link href={`/classroom/${nextLessonId}`} className="mt-3 inline-flex items-center rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-900">Next lesson <ChevronRight className="h-4 w-4"/></Link>}{completed && !nextLessonId && <Link href="/dashboard" className="mt-3 inline-flex items-center rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-900">Week complete <CheckCircle2 className="ml-1 h-4 w-4"/></Link>}
            </div>
            <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3"/>Estimated active lesson time: {Math.floor(secondsSpent / 60)} min (counts while this tab is visible)</p>
          </>}
          {tab === 'visualizer' && <MemoryVisualizer code={code} stdout={terminalOutput}/>}
          {tab === 'ai' && <div className={`h-full ${isHelpFullscreen ? 'min-h-0' : 'min-h-[55vh]'}`}><AIChatMentor currentCode={code} sessionId={lesson.id} sessionTitle={lesson.title} lessonContent={lesson.content_markdown} isFullscreen={isHelpFullscreen} onToggleFullscreen={() => void toggleHelpFullscreen()}/></div>}
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
