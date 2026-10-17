"use client"

import React, { useState } from 'react'
import { Sparkles, Send, Bot, User } from 'lucide-react'
import ChatMarkdown from './ChatMarkdown'

interface Message {
  role: 'user' | 'ai'
  content: string
  provider?: string
  fallback?: boolean
}

export default function AIChatMentor({
  currentCode,
  sessionTitle,
  lessonContent
}: {
  currentCode: string
  sessionTitle: string
  lessonContent: string
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: `👋 Hi! I’m your Python learning mentor. Ask me about this lesson or paste a question about your code. I’ll explain unfamiliar terms as we go.`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userQ = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userQ }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQ,
          code: currentCode,
          sessionTitle,
          lessonContent,
          history: messages.slice(-10).map(({ role, content }) => ({ role, content }))
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
        const reason = typeof data.error === 'string' ? data.error : 'The mentor could not prepare a reply.'
        throw new Error(reason)
      }

      setMessages((prev) => [...prev, { role: 'ai', content: data.reply, provider: data.provider, fallback: data.fallback }])
    } catch (error) {
      setInput(userQ)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: `I couldn’t get a reply just now. ${error instanceof Error ? error.message : 'Please try again.'} Your question is still in the box so you can retry.`
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/70 rounded-xl border border-white/5 overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-2 text-purple-400 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Python learning mentor</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-medium">Beginner friendly</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 font-sans">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'ai' && (
              <div className="p-1 rounded-md bg-purple-500/20 text-purple-300 shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`p-3 rounded-xl max-w-[92%] break-words leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-white rounded-br-none'
                  : 'bg-slate-900 border border-white/5 text-slate-200 rounded-bl-none'
              }`}
            >
              {m.role === 'ai' ? <ChatMarkdown content={m.content}/> : <p className="whitespace-pre-wrap">{m.content}</p>}
              {m.provider && <div className="mt-2 border-t border-white/10 pt-1 text-[10px] text-slate-400">Answered by {m.provider}{m.fallback ? ' after the first provider was unavailable' : ''}.</div>}
            </div>
            {m.role === 'user' && (
              <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-purple-400 text-xs py-1 animate-pulse font-mono">
            <Bot className="w-3.5 h-3.5" /> Reading your question and lesson...
          </div>
        )}
      </div>

      {/* Input Row */}
      <div className="p-2 bg-slate-900/90 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a question about your code..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="p-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold transition disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
