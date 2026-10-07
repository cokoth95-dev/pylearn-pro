import React from 'react'

export function HeroVisualCapsules() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
      {/* Capsule 1: Yellow/Amber */}
      <div className="h-72 rounded-[40px] bg-gradient-to-b from-amber-400 to-orange-500 p-5 flex flex-col justify-between text-slate-950 shadow-xl shadow-amber-400/20 transform hover:scale-105 transition-transform duration-300">
        <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-base">
          1
        </div>
        <div>
          <div className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">Month 1 • Free</div>
          <div className="font-extrabold text-base leading-tight mt-1">Logic & Foundations</div>
          <p className="text-[11px] font-medium text-slate-900/80 mt-1">Jars, clocks & crossroads</p>
        </div>
      </div>

      {/* Capsule 2: Sky/Blue */}
      <div className="h-80 rounded-[40px] bg-gradient-to-b from-sky-400 to-blue-600 p-5 flex flex-col justify-between text-slate-950 shadow-xl shadow-sky-400/20 transform hover:scale-105 transition-transform duration-300 -translate-y-4">
        <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-base">
          2
        </div>
        <div>
          <div className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">Month 2</div>
          <div className="font-extrabold text-base leading-tight mt-1">Data Structures & Excel</div>
          <p className="text-[11px] font-medium text-slate-900/80 mt-1">Shopping carts & file cabinets</p>
        </div>
      </div>

      {/* Capsule 3: Purple */}
      <div className="h-72 rounded-[40px] bg-gradient-to-b from-purple-400 to-indigo-600 p-5 flex flex-col justify-between text-white shadow-xl shadow-purple-400/20 transform hover:scale-105 transition-transform duration-300">
        <div className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold text-base">
          3
        </div>
        <div>
          <div className="font-mono text-xs font-black uppercase tracking-wider text-purple-200">Month 3</div>
          <div className="font-extrabold text-base leading-tight mt-1">OOP & REST APIs</div>
          <p className="text-[11px] font-medium text-purple-200/80 mt-1">Blueprints & restaurant waiters</p>
        </div>
      </div>

      {/* Capsule 4: Rose/Red */}
      <div className="h-80 rounded-[40px] bg-gradient-to-b from-rose-400 to-red-600 p-5 flex flex-col justify-between text-white shadow-xl shadow-rose-400/20 transform hover:scale-105 transition-transform duration-300 sm:col-span-1 col-span-2">
        <div className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold text-base">
          4
        </div>
        <div>
          <div className="font-mono text-xs font-black uppercase tracking-wider text-rose-200">Month 4</div>
          <div className="font-extrabold text-base leading-tight mt-1">Data Science & AI</div>
          <p className="text-[11px] font-medium text-rose-200/80 mt-1">NumPy, Pandas & Gemini API</p>
        </div>
      </div>

      {/* Capsule 5: Emerald Green */}
      <div className="h-72 rounded-[40px] bg-gradient-to-b from-emerald-400 to-teal-600 p-5 flex flex-col justify-between text-slate-950 shadow-xl shadow-emerald-400/20 transform hover:scale-105 transition-transform duration-300 -translate-y-4 sm:col-span-2 col-span-2">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-base">
            🎓
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-950 text-emerald-300 text-[10px] font-bold">
            Verified Credential
          </span>
        </div>
        <div>
          <div className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">Graduation</div>
          <div className="font-extrabold text-lg leading-tight mt-1">Verified Digital PDF Certificate</div>
          <p className="text-[11px] font-medium text-slate-900/90 mt-1">With scannable QR Code verification & 1-click LinkedIn export.</p>
        </div>
      </div>
    </div>
  )
}
