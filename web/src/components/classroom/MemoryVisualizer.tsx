"use client"

import React, { useState } from 'react'
import { Layers, Database, Cpu, ChevronRight, X } from 'lucide-react'

interface VariableState {
  [name: string]: {
    type: string
    value: string
    address: string
  }
}

export function parseLiveVariables(code: string, stdout: string): VariableState {
  const vars: VariableState = {}
  const lines = code.split('\n')

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (trimmed.includes('=') && !trimmed.startsWith('#') && !trimmed.startsWith('if') && !trimmed.startsWith('for') && !trimmed.startsWith('while') && !trimmed.includes('==')) {
      const parts = trimmed.split('=')
      const varName = parts[0].trim()
      const rawVal = parts[1].trim()

      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        let varType = 'str'
        let displayVal = rawVal

        if (rawVal.startsWith('"') || rawVal.startsWith("'")) {
          varType = 'str'
          displayVal = rawVal.replace(/^['"]|['"]$/g, '')
        } else if (/^-?\d+$/.test(rawVal)) {
          varType = 'int'
        } else if (/^-?\d+\.\d+$/.test(rawVal)) {
          varType = 'float'
        } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          varType = 'list'
        } else if (rawVal.startsWith('{') && rawVal.endsWith('}')) {
          varType = 'dict'
        } else if (rawVal === 'True' || rawVal === 'False') {
          varType = 'bool'
        }

        vars[varName] = {
          type: varType,
          value: displayVal,
          address: `0x7ffee${(idx * 16 + 1024).toString(16)}`
        }
      }
    }
  })

  return vars
}

export default function MemoryVisualizer({
  code,
  stdout
}: {
  code: string
  stdout: string
}) {
  const [selectedVar, setSelectedVar] = useState<{ name: string; type: string; value: string; address: string } | null>(null)
  const liveVars = parseLiveVariables(code, stdout)
  const varCount = Object.keys(liveVars).length

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-xl border border-white/5 p-3.5 text-xs font-mono">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Database className="w-3.5 h-3.5" />
          <span>Live Memory & Heap Inspector</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300">
          {varCount} Active Variables
        </span>
      </div>

      {/* Heap Memory Grid */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {varCount === 0 ? (
          <div className="text-center py-6 text-slate-500 text-[11px]">
            No variables assigned yet. Assign variables like <code className="text-emerald-400">age = 20</code> to inspect live memory!
          </div>
        ) : (
          Object.entries(liveVars).map(([name, data]) => (
            <div
              key={name}
              onClick={() => setSelectedVar({ name, ...data })}
              className="p-2.5 rounded-lg bg-slate-900/90 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-900 cursor-pointer transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white group-hover:text-cyan-400 transition">{name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{data.type}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-300 font-semibold max-w-[120px] truncate">{data.value}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal / Inspector Drawer for Selected Variable */}
      {selectedVar && (
        <div className="mt-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 relative text-[11px] animate-fadeIn">
          <button
            onClick={() => setSelectedVar(null)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="font-bold text-cyan-300 mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> Variable Inspector: {selectedVar.name}
          </div>
          <div className="space-y-1 text-slate-300">
            <div><strong>Data Type:</strong> <span className="text-emerald-400 font-mono">Python {selectedVar.type}</span></div>
            <div><strong>Stored Value:</strong> <span className="text-white font-mono">{selectedVar.value}</span></div>
            <div><strong>Simulated Memory Address:</strong> <span className="text-amber-400 font-mono">{selectedVar.address}</span></div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-cyan-500/20 mt-1.5">
              💡 <em>Layman Analogy:</em> A labeled storage box named <strong>{selectedVar.name}</strong> holding the value <strong>{selectedVar.value}</strong> in RAM.
            </div>
          </div>
        </div>
      )}

      {/* Footer Call Stack Badge */}
      <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-emerald-400" /> Call Stack: <span className="text-slate-300">__main__</span>
        </span>
        <span className="text-emerald-400">Garbage Collector: Active</span>
      </div>
    </div>
  )
}
