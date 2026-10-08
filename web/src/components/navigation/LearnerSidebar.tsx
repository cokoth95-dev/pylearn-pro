"use client"

import Link from 'next/link'
import { BookOpen, CreditCard, UserRound } from 'lucide-react'

export default function LearnerSidebar({ active, dark = false }: { active: 'dashboard' | 'payments'; dark?: boolean }) {
  const surface = dark ? 'border-white/10 bg-slate-900/60' : 'border-stone-200 bg-white'
  const item = (key: 'dashboard' | 'payments', label: string, href: string, Icon: typeof BookOpen) =>
    <Link key={key} href={href} aria-current={active === key ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold lg:w-full ${active === key ? 'bg-emerald-700 text-white' : dark ? 'text-slate-300 hover:bg-white/5' : 'text-stone-600 hover:bg-stone-50'}`}><Icon className="h-4 w-4"/>{label}</Link>
  return <aside aria-label="Learner navigation" className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 lg:flex-col lg:self-start ${surface}`}>
    {item('dashboard', 'Learning dashboard', '/dashboard', BookOpen)}
    {item('payments', 'Payments', '/payments', CreditCard)}
    <Link href="/profile" className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold lg:w-full ${dark ? 'text-slate-300 hover:bg-white/5' : 'text-stone-600 hover:bg-stone-50'}`}><UserRound className="h-4 w-4"/>Profile</Link>
  </aside>
}
