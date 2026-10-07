"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Editor from '@monaco-editor/react'
import { usePyodide } from '@/lib/usePyodide'
import MemoryVisualizer from '@/components/classroom/MemoryVisualizer'
import AIChatMentor from '@/components/classroom/AIChatMentor'
import {
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  BookOpen,
  Layers,
  Award,
  ArrowLeft,
  ChevronRight,
  Clock,
  Send,
  CheckCircle2,
  Lock
} from 'lucide-react'

export default function ClassroomPage() {
  const { isReady, isLoading: isPyodideLoading, runPython } = usePyodide()

  const [session, setSession] = useState({
    id: 1,
    title: "Day 1: Genesis — Thinking Like a Python Programmer",
    month: 1,
    session_number: 1,
    analogy_physical: "Variables are like labeled storage boxes in your kitchen pantry. When you put a label 'sugar' on a box, Python remembers what is inside!",
    content_markdown: `### Welcome to Python! 🐍

In this first session, you will learn how to:
1. Store information in **Variables** (labeled storage jars).
2. Collect responses from the user with \`input()\`.
3. Print clean output to the screen using modern **f-strings**.

#### The Golden Rule of Variables:
\`\`\`python
box_name = "What is stored inside"
\`\`\`
`,
    starter_code: `# Day 1: Variables & Input
name = input("What is your name? ")
birth_year = input("When were you born? ")
age = 2026 - int(birth_year)

print(f"Hello {name}!")
print(f"You are {age} years old.")
`,
    hints: [
      "Remember to wrap int() around birth_year to do math!",
      "An f-string starts with the letter f right before the quotes: f'Hello {name}'"
    ]
  })

  const [code, setCode] = useState(session.starter_code)
  const [terminalOutput, setTerminalOutput] = useState('Click "Run Code" or press Ctrl+Enter to execute Python code in your browser...')
  const [activeRightTab, setActiveRightTab] = useState<'terminal' | 'visualizer' | 'ai'>('terminal')
  const [timerSeconds, setTimerSeconds] = useState(1800) // 30-min Pomodoro
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  // Interactive input state
  const [inputQueue, setInputQueue] = useState<string[]>([])
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const [liveInputValue, setLiveInputValue] = useState('')

  // Pomodoro countdown timer
  useEffect(() => {
    let interval: any = null
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timerSeconds])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Handle Code Execution via WebAssembly Pyodide
  const handleRunCode = async () => {
    setIsExecuting(true)
    setTerminalOutput('⚡ Executing in Pyodide WebAssembly runtime...')

    const res = await runPython(code, inputQueue)
    if (res.stderr) {
      setTerminalOutput(`❌ Error:\n${res.stderr}\n\n${res.stdout}`)
    } else {
      setTerminalOutput(res.stdout || '✨ Program finished with no stdout output.')
    }
    setIsExecuting(false)
  }

  const handleSendInput = () => {
    if (!liveInputValue.trim()) return
    const newQueue = [...inputQueue, liveInputValue.trim()]
    setInputQueue(newQueue)
    setLiveInputValue('')
    setPendingPrompt(null)

    runPython(code, newQueue).then((res) => {
      if (res.stderr) {
        setTerminalOutput(`❌ Error:\n${res.stderr}\n\n${res.stdout}`)
      } else {
        setTerminalOutput(res.stdout || '✨ Program finished.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col overflow-hidden">
      {/* Top Classroom Navigation Bar */}
      <header className="h-14 px-6 bg-slate-900/90 border-b border-white/5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-sm">🐍</span>
            <span className="font-bold text-xs text-white">{session.title}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              Month {session.month} • Session {session.session_number}
            </span>
          </div>
        </div>

        {/* Timer & Run Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              isTimerRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timerSeconds)}</span>
            <span className="text-[10px] text-slate-400">{isTimerRunning ? 'Pause' : 'Start Focus'}</span>
          </button>

          <button
            onClick={() => setCode(session.starter_code)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <button
            onClick={handleRunCode}
            disabled={isExecuting || isPyodideLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isExecuting ? 'Running...' : 'Run (Ctrl+Enter)'}
          </button>
        </div>
      </header>

      {/* 3-Pane Split Screen Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* PANE 1 (Left 4 cols): Notes, Physical Analogy & Walkthrough */}
        <div className="col-span-12 lg:col-span-4 border-r border-white/5 flex flex-col bg-slate-950/40 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-white/5 flex items-center gap-2 text-xs font-bold text-slate-300">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Lesson Guide & Physical Surroundings</span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
            {/* Real-World Surroundings Card */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-300 mb-1.5">
                <span>🏠</span> Real-World Surroundings Analogy
              </div>
              <p>{session.analogy_physical}</p>
            </div>

            {/* Markdown Content */}
            <div className="prose prose-invert prose-xs max-w-none space-y-3">
              <div dangerouslySetInnerHTML={{ __html: session.content_markdown.replace(/\n/g, '<br>') }} />
            </div>

            {/* Socratic Hints Accordion */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">💡 Helpful Tips:</div>
              {session.hints.map((h, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-slate-300 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANE 2 (Center 4 cols): Monaco Code Editor */}
        <div className="col-span-12 lg:col-span-4 border-r border-white/5 flex flex-col bg-[#090d16] overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>solution.py — VS Code Monaco</span>
            <span className="text-[10px] text-emerald-400">Python 3.12 IntelliSense</span>
          </div>

          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                lineNumbers: 'on',
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>
        </div>

        {/* PANE 3 (Right 4 cols): Terminal Output, Memory Visualizer & AI Mentor */}
        <div className="col-span-12 lg:col-span-4 flex flex-col bg-slate-950/60 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-white/5 bg-slate-900/80 text-xs">
            <button
              onClick={() => setActiveRightTab('terminal')}
              className={`flex-1 py-2.5 font-semibold text-center transition flex items-center justify-center gap-1.5 ${
                activeRightTab === 'terminal' ? 'bg-slate-950 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Terminal
            </button>
            <button
              onClick={() => setActiveRightTab('visualizer')}
              className={`flex-1 py-2.5 font-semibold text-center transition flex items-center justify-center gap-1.5 ${
                activeRightTab === 'visualizer' ? 'bg-slate-950 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Memory
            </button>
            <button
              onClick={() => setActiveRightTab('ai')}
              className={`flex-1 py-2.5 font-semibold text-center transition flex items-center justify-center gap-1.5 ${
                activeRightTab === 'ai' ? 'bg-slate-950 text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Mentor
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-3 overflow-hidden flex flex-col">
            {activeRightTab === 'terminal' && (
              <div className="flex-1 flex flex-col font-mono text-xs overflow-hidden">
                <pre className="flex-1 p-3 bg-slate-950/80 rounded-xl border border-white/5 text-slate-200 whitespace-pre-wrap overflow-y-auto leading-relaxed">
                  {terminalOutput}
                </pre>

                {pendingPrompt && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">&gt;</span>
                    <input
                      type="text"
                      placeholder={`Enter value for: ${pendingPrompt}`}
                      value={liveInputValue}
                      onChange={(e) => setLiveInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
                      className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSendInput}
                      className="px-3 py-1 rounded-lg bg-emerald-400 text-slate-950 font-bold text-[11px]"
                    >
                      Send ↵
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeRightTab === 'visualizer' && (
              <MemoryVisualizer code={code} stdout={terminalOutput} />
            )}

            {activeRightTab === 'ai' && (
              <AIChatMentor currentCode={code} sessionTitle={session.title} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
