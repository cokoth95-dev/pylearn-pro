'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, MessageSquarePlus, Minimize2, Maximize2, Send, Sparkles, Trash2, User } from 'lucide-react'
import ChatMarkdown from './ChatMarkdown'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id?: string
  role: 'user' | 'ai'
  content: string
  provider?: string
  fallback?: boolean
  code_context?: string | null
}
interface SavedConversation { id: string; title: string; is_default: boolean; updated_at: string }

const greeting = '👋 Hi! I’m your Python learning mentor. Ask me about this lesson or paste a question about your code. I’ll explain unfamiliar terms as we go.'

export default function AIChatMentor({
  currentCode, sessionId, sessionTitle, lessonContent, isFullscreen, onToggleFullscreen
}: {
  currentCode: string
  sessionId: number
  sessionTitle: string
  lessonContent: string
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<Message[]>([{ role: 'ai', content: greeting }])
  const [conversations, setConversations] = useState<SavedConversation[]>([])
  const [conversationId, setConversationId] = useState('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([])
  const [showSharePreview, setShowSharePreview] = useState(false)
  const [includeCodeContext, setIncludeCodeContext] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState('')

  const loadConversation = useCallback(async (id: string) => {
    const { data, error } = await supabase.from('ai_chat_messages')
      .select('id,role,content,provider,fallback,code_context').eq('conversation_id', id).order('created_at')
    if (error) throw error
    setConversationId(id)
    setSelectedMessageIds([])
    setMessages(data?.length ? data.map((row) => ({
      id: row.id, role: row.role === 'user' ? 'user' as const : 'ai' as const,
      content: row.content, provider: row.provider ?? undefined, fallback: row.fallback, code_context: row.code_context
    })) : [{ role: 'ai', content: greeting }])
  }, [supabase])

  const refreshConversationList = useCallback(async (studentId: string) => {
    const { data, error } = await supabase.from('ai_conversations')
      .select('id,title,is_default,updated_at').eq('student_id', studentId)
      .eq('session_id', sessionId).order('updated_at', { ascending: false })
    if (error) throw error
    setConversations((data ?? []) as SavedConversation[])
    return (data ?? []) as SavedConversation[]
  }, [sessionId, supabase])

  useEffect(() => {
    let active = true
    void (async () => {
      setHistoryError('')
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw authError ?? new Error('Sign in to save lesson chats.')
        let rows = await refreshConversationList(user.id)
        let selected = rows.find((row) => row.is_default)
        if (!selected) {
          const { data, error } = await supabase.from('ai_conversations').insert({
            student_id: user.id, session_id: sessionId, title: 'Lesson help', is_default: true
          }).select('id,title,is_default,updated_at').single()
          if (error?.code === '23505') {
            rows = await refreshConversationList(user.id)
            selected = rows.find((row) => row.is_default)
          } else if (error) throw error
          else selected = data as SavedConversation
        }
        if (!selected) throw new Error('Could not open a saved chat for this lesson.')
        if (active) {
          if (!rows.some((row) => row.id === selected!.id)) setConversations((prev) => [selected!, ...prev])
          await loadConversation(selected.id)
        }
      } catch {
        if (active) setHistoryError('Chat history could not be loaded. You can still ask a question, but it may not be saved.')
      } finally {
        if (active) setIsReady(true)
      }
    })()
    return () => { active = false }
  }, [loadConversation, refreshConversationList, sessionId, supabase])

  async function startNewChat() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('ai_conversations').insert({
      student_id: user.id, session_id: sessionId, title: `Lesson help ${new Date().toLocaleDateString()}`, is_default: false
    }).select('id,title,is_default,updated_at').single()
    if (error || !data) { setHistoryError('Could not start a new saved chat.'); return }
    setConversations((previous) => [data as SavedConversation, ...previous])
    setMessages([{ role: 'ai', content: greeting }])
    setConversationId(data.id)
    setSelectedMessageIds([])
    setHistoryError('')
  }

  async function deleteCurrentChat() {
    if (!conversationId || !window.confirm('Delete this saved AI conversation and its messages? This cannot be undone.')) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId)
    if (error) { setHistoryError('Could not delete this conversation.'); return }
    const remaining = conversations.filter((chat) => chat.id !== conversationId)
    setConversations(remaining)
    if (remaining.length) await loadConversation(remaining[0].id)
    else if (user) {
      const { data, error: createError } = await supabase.from('ai_conversations').insert({
        student_id: user.id, session_id: sessionId, title: 'Lesson help', is_default: true
      }).select('id,title,is_default,updated_at').single()
      if (!createError && data) {
        setConversations([data as SavedConversation]); setConversationId(data.id); setMessages([{ role: 'ai', content: greeting }])
      }
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userQ = input.trim()
    const userMessage: Message = { role: 'user', content: userQ }
    const history = [...messages, userMessage]
    setInput('')
    setMessages(history)
    setIsLoading(true)
    try {
      if (!conversationId) throw new Error('The saved conversation is not ready yet. Please try again.')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in again to save your conversation.')
      const { data: storedUser, error: saveUserError } = await supabase.from('ai_chat_messages').insert({
        conversation_id: conversationId, role: 'user', content: userQ, code_context: currentCode || null
      }).select('id').single()
      if (saveUserError) throw saveUserError
      if (storedUser) userMessage.id = storedUser.id
      const res = await fetch('/api/ai/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQ, code: currentCode, sessionTitle, lessonContent, conversationId, questionMessageId: storedUser.id,
          history: messages.slice(-10).map(({ role, content }) => ({ role: role === 'ai' ? 'assistant' : 'user', content })) })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error(typeof data.error === 'string' ? data.error : 'The mentor could not prepare a reply.')
      }
      setMessages((prev) => [...prev, { role: 'ai', content: data.reply, id: data.savedMessageId, provider: data.provider, fallback: data.fallback }])
      setConversations((prev) => [...prev].sort((a, b) => a.id === conversationId ? -1 : b.id === conversationId ? 1 : 0))
    } catch (error) {
      setInput(userQ)
      setMessages((prev) => [...prev, { role: 'ai', content: `I couldn’t get a reply just now. ${error instanceof Error ? error.message : 'Please try again.'} Your question is still in the box so you can retry.` }])
    } finally { setIsLoading(false) }
  }

  const selectedMessages = messages.filter((message) => message.id && selectedMessageIds.includes(message.id))
  async function confirmShareWithInstructor() {
    if (!conversationId || selectedMessages.length === 0 || isSharing) return
    setIsSharing(true); setShareStatus('')
    const { data, error } = await supabase.rpc('share_ai_messages_to_instructor', {
      p_ai_conversation_id: conversationId,
      p_message_ids: selectedMessages.map((message) => message.id),
      p_include_code: includeCodeContext,
    })
    if (error) setShareStatus(error.message.includes('assigned instructor') ? 'No instructor is assigned to this course yet.' : 'The selected messages could not be shared. Please try again.')
    else {
      setShareStatus('Selected messages were shared in your private instructor chat.')
      setSelectedMessageIds([]); setShowSharePreview(false)
      if (typeof data === 'string') window.dispatchEvent(new CustomEvent('pylearn:instructor-chat-shared', { detail: { conversationId: data } }))
    }
    setIsSharing(false)
  }

  return <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/5 bg-slate-950/70 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-slate-900 px-3.5 py-2.5">
      <div className="flex items-center gap-2 font-bold text-purple-400"><Sparkles className="h-3.5 w-3.5"/><span>Python learning mentor</span><span className="text-[10px] font-medium text-emerald-400">Beginner friendly</span></div>
      <div className="flex items-center gap-1.5">
        {selectedMessageIds.length > 0 && <button type="button" onClick={() => { setIncludeCodeContext(false); setShowSharePreview(true) }} className="rounded-md border border-emerald-400/40 px-2 py-1.5 text-[11px] font-semibold text-emerald-200">Share {selectedMessageIds.length}</button>}
        <select aria-label="Saved AI conversations for this lesson" value={conversationId} onChange={(event) => void loadConversation(event.target.value)} className="max-w-36 rounded-md border border-white/15 bg-slate-950 px-2 py-1.5 text-slate-200">
          {conversations.map((chat, index) => <option key={chat.id} value={chat.id}>{chat.is_default ? 'Lesson chat' : `Chat ${conversations.length - index}`}</option>)}
        </select>
        <button type="button" onClick={() => void startNewChat()} title="Start a new chat" aria-label="Start a new chat" className="rounded-md border border-white/15 p-1.5 text-slate-200 hover:bg-white/10"><MessageSquarePlus className="h-3.5 w-3.5"/></button>
        <button type="button" onClick={() => void deleteCurrentChat()} disabled={!conversationId} title="Delete this saved conversation" aria-label="Delete this saved conversation" className="rounded-md border border-white/15 p-1.5 text-slate-200 hover:bg-rose-500/20 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5"/></button>
        <button type="button" onClick={onToggleFullscreen} aria-label={isFullscreen ? 'Exit full screen Ask for help' : 'Open Ask for help in full screen'} aria-pressed={isFullscreen} title={isFullscreen ? 'Exit full screen' : 'Full screen'} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-white/15 px-2 py-1.5 text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"><span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>{isFullscreen ? <Minimize2 className="h-3.5 w-3.5"/> : <Maximize2 className="h-3.5 w-3.5"/>}</button>
      </div>
    </div>
    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 font-sans">
      {historyError && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-amber-100">{historyError}</p>}
      {shareStatus && <p role="status" className="rounded-lg border border-sky-400/30 bg-sky-400/10 p-2 text-sky-100">{shareStatus}</p>}
      {!isReady && <p className="text-slate-400">Loading this lesson’s saved chats…</p>}
      {messages.map((message, index) => <div key={message.id ?? `${message.role}-${index}`} className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {message.role === 'ai' && <div className="shrink-0 rounded-md bg-purple-500/20 p-1 text-purple-300"><Bot className="h-3.5 w-3.5"/></div>}
        {message.id && <label className="mt-2 flex shrink-0 items-center gap-1 text-[10px] text-slate-400" title="Select this saved message to preview and share it with your instructor"><input type="checkbox" checked={selectedMessageIds.includes(message.id)} onChange={(event) => setSelectedMessageIds((current) => event.target.checked ? [...current, message.id!] : current.filter((id) => id !== message.id))} className="accent-emerald-400"/><span className="sr-only">Select this message to share</span></label>}
        <div className={`max-w-[92%] break-words rounded-xl p-3 leading-relaxed ${message.role === 'user' ? 'rounded-br-none border border-emerald-500/30 bg-emerald-500/20 text-white' : 'rounded-bl-none border border-white/5 bg-slate-900 text-slate-200'}`}>
          {message.role === 'ai' ? <ChatMarkdown content={message.content}/> : <p className="whitespace-pre-wrap">{message.content}</p>}
          {message.provider && <div className="mt-2 border-t border-white/10 pt-1 text-[10px] text-slate-400">Answered by {message.provider}{message.fallback ? ' after the first provider was unavailable' : ''}.</div>}
        </div>
        {message.role === 'user' && <div className="shrink-0 rounded-md bg-emerald-500/20 p-1 text-emerald-300"><User className="h-3.5 w-3.5"/></div>}
      </div>)}
      {isLoading && <div className="flex animate-pulse items-center gap-2 py-1 font-mono text-xs text-purple-400"><Bot className="h-3.5 w-3.5"/>Reading your question and lesson…</div>}
    </div>
    {showSharePreview && <div role="dialog" aria-modal="true" aria-labelledby="share-preview-title" className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-4"><section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-2xl"><h2 id="share-preview-title" className="text-lg font-bold">Preview what your instructor will see</h2><p className="mt-1 text-sm text-slate-300">Only the messages you selected from this lesson chat will be copied into your private instructor conversation.</p><label className="mt-4 flex items-start gap-2 rounded-xl border border-slate-700 p-3 text-sm"><input type="checkbox" checked={includeCodeContext} onChange={(event) => setIncludeCodeContext(event.target.checked)} className="mt-0.5 accent-emerald-400"/><span>Also include code saved with the selected learner messages. Code is not shared unless I select this option.</span></label><div className="mt-4 space-y-2">{selectedMessages.map((message) => <article key={message.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3"><p className="text-[10px] font-bold uppercase text-emerald-300">{message.role === 'user' ? 'Your message' : 'AI mentor reply'}</p><div className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap text-sm text-slate-200">{message.content}</div>{includeCodeContext && message.role === 'user' && message.code_context && <pre className="mt-2 max-h-36 overflow-auto rounded bg-black p-2 font-mono text-xs text-emerald-100">{message.code_context}</pre>}</article>)}</div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setShowSharePreview(false)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Cancel</button><button type="button" disabled={isSharing || selectedMessages.length === 0} onClick={() => void confirmShareWithInstructor()} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{isSharing ? 'Sharing…' : 'Confirm and share'}</button></div></section></div>}
    <div className="flex items-center gap-2 border-t border-white/5 bg-slate-900/90 p-2">
      <input type="text" placeholder="Ask a question about your code…" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void handleSend()} className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 transition focus:border-purple-500 focus:outline-none"/>
      <button type="button" onClick={() => void handleSend()} disabled={isLoading || !isReady} aria-label="Send question" className="rounded-lg bg-purple-500 p-2 font-bold text-slate-950 transition hover:bg-purple-400 disabled:opacity-50"><Send className="h-3.5 w-3.5"/></button>
    </div>
  </div>
}
