"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Layers,
  BookOpen,
  Plus,
  Users,
  Video,
  Code2,
  CheckCircle,
  Clock,
  Shield,
  Search,
  Eye,
  Edit,
  Trash2,
  Save,
  DollarSign,
  AlertCircle
} from 'lucide-react'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'students' | 'assignments'>('sessions')

  // Mock sessions managed by Admin
  const [sessions, setSessions] = useState([
    {
      id: 1,
      month: 1,
      session_number: 1,
      title: "Day 1: Genesis — Thinking Like a Python Programmer",
      analogy: "Storage jars in kitchen pantry",
      videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      xp: 50
    },
    {
      id: 2,
      month: 1,
      session_number: 2,
      title: "Day 2: Data Types as Physical Containers (Int, Float, Str, Bool)",
      analogy: "Tupperware containers with different labels",
      videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      xp: 50
    },
    {
      id: 3,
      month: 1,
      session_number: 3,
      title: "Day 3: Control Flow Crossroads — If, Elif, Else Logic",
      analogy: "Traffic lights and fork in the road",
      videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      xp: 50
    }
  ])

  // Mock enrolled students list
  const [students, setStudents] = useState([
    {
      id: "u1",
      name: "Alex Kamau",
      email: "alex@example.com",
      phone: "+254 712 345 678",
      location: "Nairobi, Kenya",
      age: 24,
      feeStatus: "free_month1",
      xp: 250,
      streak: 3,
      progress: "Week 1 (Day 1 Done)"
    },
    {
      id: "u2",
      name: "Sarah Chen",
      email: "sarah.c@example.com",
      phone: "+1 415 555 2671",
      location: "San Francisco, USA",
      age: 29,
      feeStatus: "paid_full",
      xp: 820,
      streak: 8,
      progress: "Week 3 (Day 12 Done)"
    },
    {
      id: "u3",
      name: "David Ochieng",
      email: "david.o@example.com",
      phone: "+254 798 112 334",
      location: "Mombasa, Kenya",
      age: 21,
      feeStatus: "paid_monthly",
      xp: 450,
      streak: 5,
      progress: "Week 2 (Day 6 Done)"
    }
  ])

  // New Session Form Modal state
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [newSession, setNewSession] = useState({
    month: 1,
    session_number: 4,
    title: "",
    analogy: "",
    videoUrl: "",
    content: "",
    starterCode: "# Starter code for student\n",
    xp: 50
  })

  // Add Session handler
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSession.title.trim()) return

    setSessions([
      ...sessions,
      {
        id: sessions.length + 1,
        month: newSession.month,
        session_number: newSession.session_number,
        title: newSession.title,
        analogy: newSession.analogy,
        videoUrl: newSession.videoUrl,
        xp: newSession.xp
      }
    ])
    setShowAddSessionModal(false)
    setNewSession({
      month: 1,
      session_number: sessions.length + 2,
      title: "",
      analogy: "",
      videoUrl: "",
      content: "",
      starterCode: "# Starter code\n",
      xp: 50
    })
  }

  // Toggle student fee / access status
  const handleToggleFeeStatus = (studentId: string) => {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        const nextStatus = s.feeStatus === 'free_month1' ? 'paid_full' : 'free_month1'
        return { ...s, feeStatus: nextStatus }
      }
      return s
    }))
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Admin Top Header */}
      <header className="h-16 px-6 bg-slate-900/90 border-b border-white/5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <span className="font-extrabold text-base text-white tracking-tight">
              PyLearn <span className="text-emerald-400">Pro</span> Admin CMS
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Instructor & Academy Management</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
          >
            ← View Student Classroom
          </Link>
          <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Super Admin
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'sessions' ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Curriculum & Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'students' ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Enrolled Students ({students.length})
          </button>
        </div>

        {/* TAB 1: Sessions & Curriculum Manager */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">4-Month Curriculum & Session Editor</h2>
                <p className="text-slate-400 text-xs mt-0.5">Add lecture notes, attach video links, physical analogies, and starter code.</p>
              </div>
              <button
                onClick={() => setShowAddSessionModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Session
              </button>
            </div>

            {/* Sessions Grid / Table */}
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-white/5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Session #</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Surroundings Analogy</th>
                    <th className="py-3 px-4">Video Link</th>
                    <th className="py-3 px-4">XP Reward</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        M{sess.month} • S{sess.session_number}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">{sess.title}</td>
                      <td className="py-3.5 px-4 text-amber-300/90 max-w-[200px] truncate">{sess.analogy}</td>
                      <td className="py-3.5 px-4 text-cyan-400 max-w-[180px] truncate font-mono text-[11px]">
                        <a href={sess.videoUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" /> {sess.videoUrl}
                        </a>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-purple-400">+{sess.xp} XP</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          href={`/classroom/${sess.session_number}`}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
                        >
                          Preview
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Students & Payment Verification Manager */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Enrolled Students & Tuition Manager</h2>
                <p className="text-slate-400 text-xs mt-0.5">Manage student access, verify MPesa/Stripe payments, and view completion rates.</p>
              </div>
            </div>

            {/* Students Table */}
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-white/5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Contact & Location</th>
                    <th className="py-3 px-4">Age</th>
                    <th className="py-3 px-4">Tuition / Access</th>
                    <th className="py-3 px-4">Progress & XP</th>
                    <th className="py-3 px-4 text-right">1-Click Access Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div>{st.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal font-mono">{st.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{st.phone}</div>
                        <div className="text-[10px] text-slate-500">{st.location}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{st.age} yrs</td>
                      <td className="py-3.5 px-4">
                        {st.feeStatus === 'paid_full' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            Full Academy Paid
                          </span>
                        ) : st.feeStatus === 'paid_monthly' ? (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-[10px]">
                            Monthly Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px]">
                            Month 1 Free Trial
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-emerald-400 font-bold">{st.xp} XP (🔥 {st.streak}d streak)</div>
                        <div className="text-[10px] text-slate-400">{st.progress}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleFeeStatus(st.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            st.feeStatus === 'free_month1'
                              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st.feeStatus === 'free_month1' ? '✓ Unlock Months 2-4' : 'Set to Free Trial'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add New Session */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel rounded-3xl border border-white/10 p-6 max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <Plus className="w-5 h-5" />
                <span>Create New Classroom Session</span>
              </div>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Month (1 to 4)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={newSession.month}
                    onChange={(e) => setNewSession({ ...newSession, month: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Session Number</label>
                  <input
                    type="number"
                    value={newSession.session_number}
                    onChange={(e) => setNewSession({ ...newSession, session_number: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Day 4: Repeating Clocks — While and For Loop Iterations"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Physical Surroundings Analogy</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A loop is like washing dishes until the sink is empty"
                  value={newSession.analogy}
                  onChange={(e) => setNewSession({ ...newSession, analogy: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">YouTube / Vimeo Embed URL</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newSession.videoUrl}
                  onChange={(e) => setNewSession({ ...newSession, videoUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Starter Python Code</label>
                <textarea
                  rows={4}
                  value={newSession.starterCode}
                  onChange={(e) => setNewSession({ ...newSession, starterCode: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                Save & Publish Session
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
