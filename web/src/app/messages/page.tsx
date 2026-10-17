'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, LockKeyhole, MessageCircle, Pin, Plus, Send, ShieldAlert, Users } from 'lucide-react'
import AccountMenu from '@/components/account/AccountMenu'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

type Course = { id: string; title: string }
type CourseLesson = { id: number; title: string }
type Thread = { id: string; course_id: string; kind: 'private_chat' | 'discussion' | 'announcement'; title: string; is_pinned: boolean; locked_at: string | null; updated_at: string; latest_body: string | null; latest_sender_id: string | null; latest_at: string | null; unread_count: number }
type Message = { id: string; conversation_id: string; sender_id: string; body: string; reply_to: string | null; lesson_id: number | null; edited_at: string | null; deleted_at: string | null; is_pinned: boolean; created_at: string; display_name: string; sender_role: string }

function renderMessageBody(body: string) {
  const chunks = body.split(/```(?:python)?\s*\n?/i)
  return chunks.map((chunk, index) => index % 2 === 1
    ? <pre key={index} className="my-2 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 text-emerald-100"><code>{chunk.replace(/\n?```\s*$/, '')}</code></pre>
    : <span key={index} className="whitespace-pre-wrap">{chunk.replace(/```/g, '')}</span>)
}

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('student')
  const [courses, setCourses] = useState<Course[]>([])
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selected, setSelected] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [draft, setDraft] = useState('')
  const [lessonToAttach, setLessonToAttach] = useState('')
  const [threadTitle, setThreadTitle] = useState('')
  const [newThreadOpen, setNewThreadOpen] = useState(false)
  const [announcementMode, setAnnouncementMode] = useState(false)
  const [threadFilter, setThreadFilter] = useState<'all' | 'private' | 'board'>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refreshThreads = useCallback(async () => {
    const { data, error: queryError } = await supabase.rpc('conversation_inbox_summaries')
    if (queryError) throw queryError
    const rows = (data ?? []) as Thread[]
    setThreads(rows)
    setSelected((current) => current && rows.some((thread) => thread.id === current) ? current : rows[0]?.id ?? '')
    return rows
  }, [supabase])

  const refreshMessages = useCallback(async (threadId: string) => {
    const { data, error: queryError } = await supabase.rpc('conversation_messages_for_thread', { p_conversation_id: threadId })
    if (queryError) throw queryError
    setMessages((data ?? []) as Message[])
    await supabase.from('conversation_reads').upsert({ conversation_id: threadId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: 'conversation_id,user_id' })
  }, [supabase, userId])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace('/login'); return }
        setUserId(user.id)
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        const userRole = profile?.role ?? 'student'
        if (!active) return
        setRole(userRole)
        let courseLinks: Course[] = []
        if (userRole === 'student') {
          const { data } = await supabase.from('course_enrollments').select('course_id,courses(id,title)').eq('student_id', user.id).eq('status', 'active')
          courseLinks = (data ?? []).map((row) => row.courses).filter(Boolean) as unknown as Course[]
        } else {
          const { data } = await supabase.from('course_instructors').select('course_id,courses(id,title)').eq('instructor_id', user.id)
          courseLinks = (data ?? []).map((row) => row.courses).filter(Boolean) as unknown as Course[]
        }
        if (!active) return
        setCourses(courseLinks)
        setSelectedCourse(courseLinks[0]?.id ?? '')
        await refreshThreads()
      } catch {
        if (active) setError('We could not load your messages. Please refresh and try again.')
      } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [refreshThreads, router, supabase])

  useEffect(() => {
    if (!selected || !userId) return
    const initialLoad = window.setTimeout(() => { void refreshMessages(selected).then(() => refreshThreads()).catch(() => setError('We could not load this conversation.')) }, 0)
    const channel = supabase.channel(`thread:${selected}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${selected}` }, () => { void refreshMessages(selected).then(() => refreshThreads()) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => void refreshThreads())
      .subscribe()
    return () => { window.clearTimeout(initialLoad); void supabase.removeChannel(channel) }
  }, [refreshMessages, refreshThreads, selected, supabase, userId])

  async function openInstructorChat() {
    if (!selectedCourse) return
    setBusy(true); setError('')
    const { data, error: rpcError } = await supabase.rpc('open_assigned_instructor_chat', { p_course_id: selectedCourse })
    if (rpcError) setError(rpcError.message.includes('No instructor') ? 'An instructor has not been assigned to you for this course yet.' : 'Could not open your instructor conversation.')
    else if (data) { await refreshThreads(); setSelected(data as string) }
    setBusy(false)
  }

  async function startDiscussion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse || !threadTitle.trim() || !draft.trim()) return
    setBusy(true); setError('')
    const { data, error: rpcError } = await supabase.rpc('start_course_discussion', {
      p_course_id: selectedCourse, p_title: threadTitle.trim(), p_body: draft.trim(), p_announcement: announcementMode
    })
    if (rpcError) setError('Could not publish your topic. Check your course access and try again.')
    else {
      setDraft(''); setThreadTitle(''); setNewThreadOpen(false); setAnnouncementMode(false)
      await refreshThreads()
      setSelected(data as string)
    }
    setBusy(false)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !selected || busy) return
    setBusy(true); setError('')
    const lessonId = Number(lessonToAttach)
    const { error: sendError } = await supabase.from('conversation_messages').insert({ conversation_id: selected, sender_id: userId, body: text, lesson_id: Number.isSafeInteger(lessonId) && lessonId > 0 ? lessonId : null })
    if (sendError) setError(sendError.message.includes('row-level security') ? 'You do not have access to send a message in this thread.' : 'Your message was not sent. Please try again.')
    else { setDraft(''); setLessonToAttach(''); await refreshMessages(selected); await refreshThreads() }
    setBusy(false)
  }

  async function reportMessage(messageId: string) {
    const reason = window.prompt('What is the concern? Enter inappropriate, privacy, safety, unhelpful, or other.')
    if (!reason) return
    const allowed = ['inappropriate', 'privacy', 'safety', 'unhelpful', 'other']
    const normalized = reason.trim().toLowerCase()
    if (!allowed.includes(normalized)) { setError('Use one of the listed report reasons.'); return }
    const { error: reportError } = await supabase.rpc('report_conversation_message', { p_message_id: messageId, p_reason: normalized, p_details: null })
    setError(reportError ? 'Could not submit this report.' : 'Report sent to the restricted moderation queue.')
  }

  const activeThread = threads.find((thread) => thread.id === selected)
  const activeCourse = courses.find((course) => course.id === activeThread?.course_id)
  const isStaff = role === 'instructor' || role === 'admin'
  const visibleThreads = threads.filter((thread) => threadFilter === 'all' || (threadFilter === 'private' ? thread.kind === 'private_chat' : thread.kind !== 'private_chat'))

  useEffect(() => {
    const courseId = activeThread?.course_id ?? selectedCourse
    if (!courseId) return
    let active = true
    void supabase.from('sessions').select('id,title,modules!inner(course_id,status)')
      .eq('modules.course_id', courseId).eq('modules.status', 'published').order('id')
      .then(({ data }) => { if (active) setCourseLessons((data ?? []).map((row) => ({ id: row.id, title: row.title }))) })
    return () => { active = false }
  }, [activeThread?.course_id, selectedCourse, supabase])

  return <main className="min-h-screen bg-[#faf7f0] text-stone-900">
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 md:px-8">
      <Link href={isStaff ? '/instructor' : '/dashboard'} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-emerald-800"><ArrowLeft className="h-4 w-4"/>{isStaff ? 'Instructor workspace' : 'Learning dashboard'}</Link>
      <div className="flex items-center gap-2"><ThemeToggle/><AccountMenu/></div>
    </header>
    <div className="mx-auto max-w-7xl p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Class communication</p><h1 className="mt-1 text-3xl font-extrabold">Messages and course board</h1><p className="mt-2 text-sm text-stone-600">Ask your assigned instructor privately or share a question with your course.</p></div><div className="flex items-center gap-2 text-xs text-stone-600"><Bell className="h-4 w-4 text-emerald-700"/>New messages appear live when connected</div></div>
      {error && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {loading ? <p className="rounded-2xl bg-white p-8 text-center text-stone-600">Loading your class conversations…</p> : <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between px-2 py-2"><h2 className="font-bold">Your conversations</h2><MessageCircle className="h-4 w-4 text-emerald-700"/></div>
          {courses.length > 1 && <label className="mt-2 block px-2 text-xs font-semibold text-stone-600">Course<select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-stone-900">{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>}
          <div className="mt-3 flex gap-1 rounded-lg bg-stone-100 p-1">{(['all', 'private', 'board'] as const).map((filter) => <button key={filter} type="button" aria-pressed={threadFilter === filter} onClick={() => setThreadFilter(filter)} className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold capitalize ${threadFilter === filter ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600'}`}>{filter === 'private' ? 'Private' : filter === 'board' ? 'Course board' : 'All'}</button>)}</div>
          {role === 'student' && <button type="button" disabled={busy || !selectedCourse} onClick={() => void openInstructorChat()} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-left text-sm font-semibold text-white disabled:opacity-50"><LockKeyhole className="h-4 w-4"/>Ask your instructor</button>}
          {role !== 'student' && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setAnnouncementMode(false); setNewThreadOpen(true) }} className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-2.5 py-2.5 text-left text-xs font-semibold text-white"><Plus className="h-4 w-4"/>New topic</button><button type="button" onClick={() => { setAnnouncementMode(true); setNewThreadOpen(true) }} className="flex items-center gap-1.5 rounded-xl border border-emerald-700 px-2.5 py-2.5 text-left text-xs font-semibold text-emerald-800"><Bell className="h-4 w-4"/>Announcement</button></div>}
          <div className="mt-4 space-y-1">
            {visibleThreads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelected(thread.id)} className={`w-full rounded-xl p-3 text-left ${selected === thread.id ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-stone-50'}`}><span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">{thread.kind === 'private_chat' ? <LockKeyhole className="h-3 w-3"/> : <Users className="h-3 w-3"/>}{thread.kind === 'private_chat' ? 'Private instructor chat' : thread.kind === 'announcement' ? 'Announcement' : 'Course topic'}{thread.is_pinned && <Pin className="h-3 w-3"/>}{thread.unread_count > 0 && <span className="ml-auto rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] text-white">{thread.unread_count > 99 ? '99+' : thread.unread_count} new</span>}</span><span className="mt-1 block truncate text-sm font-semibold">{thread.title}</span><span className="mt-1 block truncate text-xs text-stone-500">{courses.find((course) => course.id === thread.course_id)?.title ?? 'Course'}</span>{thread.latest_body && <span className="mt-1 block truncate text-xs text-stone-600">{thread.latest_sender_id === userId ? 'You: ' : ''}{thread.latest_body}</span>}</button>)}
            {visibleThreads.length === 0 && <p className="px-3 py-6 text-sm text-stone-500">{threads.length ? 'No conversations in this filter.' : 'No conversations yet. Start by asking your instructor or creating a course topic.'}</p>}
          </div>
          <div className="mt-5 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-stone-600"><ShieldAlert className="mb-1 h-4 w-4 text-emerald-700"/>Keep personal contact details private. Course board posts show your classroom display name.</div>
        </aside>
        <section className="flex min-h-[65vh] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {newThreadOpen && <form onSubmit={startDiscussion} className="space-y-2 border-b border-stone-200 bg-emerald-50/50 p-4"><h2 className="font-bold">{announcementMode ? 'Post a course announcement' : 'Start a course topic'}</h2><label className="sr-only" htmlFor="thread-title">Topic title</label><input id="thread-title" required maxLength={160} value={threadTitle} onChange={(event) => setThreadTitle(event.target.value)} placeholder="Topic title, for example: Help with if statements" className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"/><label className="sr-only" htmlFor="thread-first-message">First post</label><textarea id="thread-first-message" required maxLength={12000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Explain the topic or share the announcement…" className="min-h-24 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"/><div className="flex justify-end gap-2"><button type="button" onClick={() => { setNewThreadOpen(false); setDraft('') }} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{announcementMode ? 'Post announcement' : 'Publish topic'}</button></div></form>}
          {activeThread ? <><header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 p-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">{activeThread.kind === 'private_chat' ? 'Private conversation' : activeThread.kind === 'announcement' ? 'Instructor announcement' : 'Course board'} · {activeCourse?.title ?? 'Course'}</p><h2 className="mt-1 text-lg font-bold">{activeThread.title}</h2></div><div className="flex items-center gap-2">{activeThread.locked_at && <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600"><LockKeyhole className="h-3 w-3"/>Thread locked</span>}{isStaff && activeThread.kind !== 'private_chat' && <><button type="button" onClick={async () => { const { error: rpcError } = await supabase.rpc('moderate_course_thread', { p_conversation_id: activeThread.id, p_lock: !activeThread.locked_at, p_pin: null }); if (rpcError) setError('Could not update the thread.'); else await refreshThreads() }} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold">{activeThread.locked_at ? 'Unlock' : 'Lock'} thread</button>{activeThread.kind === 'announcement' && <button type="button" onClick={async () => { const { error: rpcError } = await supabase.rpc('moderate_course_thread', { p_conversation_id: activeThread.id, p_lock: null, p_pin: !activeThread.is_pinned }); if (rpcError) setError('Could not pin this announcement.'); else await refreshThreads() }} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold">{activeThread.is_pinned ? 'Unpin' : 'Pin'}</button>}</>}</div></header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50/70 p-4">
              {messages.map((message) => <article key={message.id} className={`max-w-3xl rounded-xl border p-3 ${message.sender_id === userId ? 'ml-auto border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-stone-700">{message.sender_id === userId ? 'You' : message.display_name}</span><time className="text-[10px] text-stone-500">{new Date(message.created_at).toLocaleString()}{message.edited_at ? ' · edited' : ''}</time></div>
                {message.deleted_at ? <p className="mt-2 text-sm italic text-stone-500">This message was removed.</p> : <div className="mt-2 break-words text-sm leading-6 text-stone-800">{renderMessageBody(message.body)}</div>}
                {message.lesson_id && <Link href={`/classroom/${message.lesson_id}`} className="mt-2 inline-block rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Open linked lesson</Link>}
                <div className="mt-2 flex justify-end gap-3 text-[11px]">{message.sender_id === userId && !message.deleted_at && <button type="button" onClick={async () => { const text = window.prompt('Edit your message', message.body); if (text === null || !text.trim()) return; const { error: editError } = await supabase.from('conversation_messages').update({ body: text.trim() }).eq('id', message.id); if (editError) setError('Could not edit this message.'); else await refreshMessages(selected) }} className="text-stone-500 underline">Edit</button>}{message.sender_id === userId && !message.deleted_at && <button type="button" onClick={async () => { if (!window.confirm('Remove this message?')) return; const { error: deleteError } = await supabase.from('conversation_messages').update({ deleted_at: new Date().toISOString() }).eq('id', message.id); if (deleteError) setError('Could not remove this message.'); else await refreshMessages(selected) }} className="text-stone-500 underline">Delete</button>}{isStaff && activeThread.kind !== 'private_chat' && <button type="button" onClick={async () => { const { error: moderateError } = await supabase.rpc('moderate_conversation_message', { p_message_id: message.id, p_hide: !message.deleted_at, p_pin: null }); if (moderateError) setError('Could not moderate this message.'); else await refreshMessages(selected) }} className="text-amber-800 underline">{message.deleted_at ? 'Restore post' : 'Hide post'}</button>}{message.sender_id !== userId && !message.deleted_at && <button type="button" onClick={() => void reportMessage(message.id)} className="text-rose-700 underline">Report</button>}</div>
              </article>)}
              {messages.length === 0 && <p className="py-10 text-center text-sm text-stone-500">This conversation is ready. Send the first message below.</p>}
            </div>
            {!activeThread.locked_at && <form onSubmit={sendMessage} className="border-t border-stone-200 p-3"><div className="flex items-end gap-2"><label className="sr-only" htmlFor="message-body">Write a message</label><textarea id="message-body" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={12000} placeholder="Write a message or reply to a topic…" className="min-h-11 max-h-36 flex-1 resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400"/><button disabled={busy || !draft.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white disabled:opacity-40"><Send className="h-4 w-4"/></button></div><div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={() => { const fence = String.fromCharCode(96).repeat(3); setDraft((current) => `${current}${current ? '\n\n' : ''}${fence}python\n# Write your code here\n${fence}`) }} className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">Insert code snippet</button><label className="flex items-center gap-1.5 text-xs text-stone-600">Attach lesson link<select aria-label="Select a lesson to attach" value={lessonToAttach} onChange={(event) => setLessonToAttach(event.target.value)} className="max-w-56 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900"><option value="">No lesson link</option>{courseLessons.map((courseLesson) => <option key={courseLesson.id} value={courseLesson.id}>{courseLesson.title}</option>)}</select></label>{lessonToAttach && <button type="button" onClick={() => setLessonToAttach('')} className="text-xs text-rose-700 underline">Remove link</button>}</div></form>}
          </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><MessageCircle className="mx-auto h-10 w-10 text-emerald-700"/><h2 className="mt-3 text-lg font-bold">Choose a conversation</h2><p className="mt-1 max-w-md text-sm text-stone-600">Your private instructor messages and shared course topics will appear here.</p></div></div>}
        </section>
      </div>}
      <p className="mt-4 text-xs leading-5 text-stone-500">Messages are available during the course and for 12 months after it ends, subject to an open safety or legal hold. Reported content goes to a restricted administrator review queue.</p>
    </div>
  </main>
}
