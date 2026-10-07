"use client"

import React, { useState } from 'react'
import { Sparkles, Send, Bot, User, HelpCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'ai'
  content: string
}

export default function AIChatMentor({
  currentCode,
  sessionTitle
}: {
  currentCode: string
  sessionTitle: string
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: `👋 Hi! I'm your Google Gemini Layman Python Mentor. Ask me anything about this lesson or your code (e.g. "What does int() do?", "Why use f-strings?")!`
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
      // Call Gemini API Route
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQ,
          code: currentCode,
          sessionTitle
        })
      })

      const data = await res.json()
      const reply = data.reply || 'An f-string lets you put variables directly inside `{}` instead of using plus signs!'

      setMessages((prev) => [...prev, { role: 'ai', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: 'Think of variables like labeled jars on a kitchen shelf. You store a value inside, and whenever you write the jar label, Python grabs what is inside!'
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
          <span>Gemini 3.6 Flash Layman Mentor</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-medium">24/7 Socratic Mode</span>
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
              className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-white rounded-br-none'
                  : 'bg-slate-900 border border-white/5 text-slate-200 rounded-bl-none'
              }`}
            >
              {m.content}
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
            <Bot className="w-3.5 h-3.5" /> Thinking of a crystal-clear layman explanation...
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
