'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

const THEME_KEY = 'pylearnpro-theme'
const THEME_EVENT = 'pylearnpro-theme-change'
const getThemeSnapshot = (): Theme => window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
const getServerThemeSnapshot = (): Theme => 'light'
const subscribeToTheme = (callback: () => void) => {
  window.addEventListener('storage', callback)
  window.addEventListener(THEME_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(THEME_EVENT, callback)
  }
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem(THEME_KEY, nextTheme)
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-pressed={theme === 'dark'}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
        theme === 'light'
          ? 'border-slate-300/70 bg-white/70 text-slate-700 hover:bg-white'
          : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
      }`}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden sm:inline">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
    </button>
  )
}
