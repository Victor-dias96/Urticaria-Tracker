'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
interface HeaderProps {
  dark: boolean
  onToggleDark: () => void
  startDate: string
  onStartDateChange: (date: string) => void
}

export default function Header({ dark, onToggleDark, startDate, onStartDateChange }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-rose-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Logo + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-wine-600 to-wine-800 flex items-center justify-center shrink-0 shadow-md">
            <span className="text-white font-bold text-sm sm:text-base leading-none">U</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-wine-700 dark:text-wine-300 font-bold text-base sm:text-lg leading-tight truncate">
              Urticaria Tracker
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs leading-tight hidden sm:block">
              Controle semanal de urticária — UAS7
            </p>
          </div>
        </div>

        {/* Right side: week badge + dark toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-wine-50 dark:bg-wine-950 border border-wine-200 dark:border-wine-800 text-wine-700 dark:text-wine-300 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200">
            <span className="whitespace-nowrap">Semana de:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent border-none outline-none text-wine-700 dark:text-wine-300 font-bold focus:ring-0 p-0 m-0 cursor-pointer text-xs"
            />
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            id="dark-mode-toggle"
            aria-label="Alternar tema claro/escuro"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
          >
            {dark ? (
              <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="Sair da conta"
            className="flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-800/50 text-rose-700 dark:text-rose-300 px-3 h-9 rounded-lg text-sm font-semibold transition-colors duration-200 border border-rose-200 dark:border-rose-800"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
