'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
      {/* A MÁGICA ACONTECE AQUI: 
        1. Tiramos o 'h-14' fixo do celular e colocamos 'py-3' (padding) para o cabeçalho poder crescer.
        2. Usamos flex-wrap para permitir múltiplas linhas.
      */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">

        {/* ==================================================== */}
        {/* 1. LOGO (Sempre primeiro: order-1)                   */}
        {/* ==================================================== */}
        <div className="flex items-center gap-2 min-w-0 order-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 shadow-md overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
            <img src="/logo.png" alt="Urticaria Tracker Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-wine-700 dark:text-wine-300 font-bold text-[15px] sm:text-lg leading-tight truncate">
              Urticaria Tracker
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs leading-tight hidden sm:block">
              Controle semanal de urticária — UAS7
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 2. BOTÕES DE AÇÃO (No mobile ficam no topo: order-2)  */}
        {/* ==================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-3 ml-auto sm:ml-0">
          {/* Dark mode toggle */}
          {/* Botão de Dark Mode */}
          <button
            onClick={onToggleDark}
            aria-label="Alternar tema claro/escuro"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 border border-rose-100 dark:border-gray-700/60 hover:bg-rose-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            {dark ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.536a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Botão Galeria */}
          <Link
            href="/galeria"
            title="Ver Galeria de Crises"
            className="flex items-center justify-center gap-1.5 bg-wine-50 dark:bg-wine-950/30 hover:bg-wine-100 dark:hover:bg-wine-900/50 text-wine-700 dark:text-wine-300 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 border border-wine-200 dark:border-wine-800"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Galeria de Crises</span>
            <span className="sm:hidden">Galeria</span>
          </Link>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="Sair da conta"
            className="flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-800/50 text-rose-700 dark:text-rose-300 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 border border-rose-200 dark:border-rose-800"
          >
            Sair
          </button>
        </div>

        {/* ==================================================== */}
        {/* 3. SELETOR DE SEMANA (Desce pro rodapé: order-3)     */}
        {/* ==================================================== */}
        <div className="flex items-center justify-center gap-2 bg-wine-50 dark:bg-wine-950 border border-wine-200 dark:border-wine-800 text-wine-700 dark:text-wine-300 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 w-full sm:w-auto order-3 sm:order-2 sm:mr-3">
          <span className="whitespace-nowrap hidden sm:inline">Semana de:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent border-none outline-none text-wine-700 dark:text-wine-300 font-bold focus:ring-0 p-0 m-0 cursor-pointer text-sm w-full sm:w-auto text-center sm:text-left"
          />
        </div>

      </div>
    </header>
  )
}