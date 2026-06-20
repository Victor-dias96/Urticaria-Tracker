'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [dark, setDark] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const root = document.documentElement
    dark ? root.classList.add('dark') : root.classList.remove('dark')
  }, [dark])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        console.log("Login efetuado com sucesso!", data)
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha para criar uma conta.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        console.log("Login efetuado com sucesso!", data)
      }

      setSuccess('Conta criada com sucesso! Redirecionando...')
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Botão de Dark Mode no canto superior direito */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          onClick={() => setDark(d => !d)}
          aria-label="Alternar tema claro/escuro"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105"
        >
          {dark ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-transparent dark:border-slate-700/50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-rose-700 rounded-full flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl font-bold text-white">U</span>
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
            Urticaria Tracker
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Acesse seu diário clínico
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent sm:text-sm transition-colors"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {success && (
            <div className="text-emerald-600 dark:text-emerald-400 text-sm text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="flex flex-col space-y-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? 'Processando...' : 'Entrar'}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Ou
                </span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="group w-full flex justify-center py-3 px-4 border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Criar Conta
            </button>
          </div>

          {/* Mensagem de erro renderizada abaixo dos botões */}
          {error && (
            <div className="text-red-500 text-sm text-center mt-2">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
