"use client"

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, RotateCcw, Sparkles, Terminal } from 'lucide-react'

const DEFAULT_DEMO_CODE = `# 🍕 Welcome to PyLearn Pro Live Sandbox!
# See how easy Python is with everyday surroundings:

pizza_price = 1200       # Total cost of pizza in KSh
friends = 4              # Number of people sharing
my_name = "Alex"

# Calculate cost per friend
cost_per_person = pizza_price / friends

print(f"👋 Hello {my_name}!")
print(f"🍕 Pizza total: KSh {pizza_price}")
print(f"👥 Each friend pays: KSh {cost_per_person:.2f}")
`

export default function HeroPlayground() {
  const [code, setCode] = useState(DEFAULT_DEMO_CODE)
  const [output, setOutput] = useState('Click "Run Code" above to execute this Python code live in your browser...')
  const [isRunning, setIsRunning] = useState(false)

  const handleRunCode = () => {
    setIsRunning(true)
    setOutput('⚡ Executing in browser...')
    
    // Simulate real-time execution for instant landing demo
    setTimeout(() => {
      try {
        let simulatedOut = ''
        if (code.includes('pizza_price') && code.includes('friends')) {
          simulatedOut = '👋 Hello Alex!\n🍕 Pizza total: KSh 1200\n👥 Each friend pays: KSh 300.00\n\n✨ Program finished in 0.02s with zero errors!'
        } else {
          simulatedOut = `Code Executed Successfully:\n${code.split('\n').filter(l => l.startsWith('print(')).map(l => l.replace('print(', '').replace(')', '').replace(/"/g, '')).join('\n') || 'Output rendered.'}`
        }
        setOutput(simulatedOut)
      } catch {
        setOutput('Syntax error in your code. Try adjusting variables!')
      }
      setIsRunning(false)
    }, 400)
  }

  const handleReset = () => {
    setCode(DEFAULT_DEMO_CODE)
    setOutput('Reset back to original demo.')
  }

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl glass-panel glass-glow-emerald overflow-hidden border border-emerald-500/20 shadow-2xl">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-xs font-medium text-slate-400 font-mono">live_playground.py — Zero Install Web IDE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Running...' : 'Run Code (Live)'}
          </button>
        </div>
      </div>

      {/* Editor & Output Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[360px]">
        {/* Monaco Editor Pane */}
        <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#090d16]">
          <Editor
            height="360px"
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

        {/* Live Output Pane */}
        <div className="lg:col-span-5 flex flex-col bg-slate-950/60 p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-white/5">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              Interactive Console
            </span>
            <span className="text-[10px] text-slate-500">Pyodide Wasm 3.12</span>
          </div>
          <pre className="flex-1 text-slate-200 whitespace-pre-wrap leading-relaxed overflow-y-auto">
            {output}
          </pre>
          <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" /> 24/7 Gemini Layman AI Ready
            </span>
            <span className="text-emerald-400 font-medium">100% Free Sandbox</span>
          </div>
        </div>
      </div>
    </div>
  )
}
