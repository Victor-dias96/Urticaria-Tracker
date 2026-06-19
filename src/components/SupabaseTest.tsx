'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } = await supabase.auth.getSession()
        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
        } else {
          setStatus('success')
        }
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message || 'Erro desconhecido ao conectar com Supabase')
      }
    }

    testConnection()
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex justify-center mb-4">
        <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/50 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50 shadow-sm animate-pulse">
          Testando conexão...
        </span>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex justify-center mb-4">
        <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full dark:bg-green-900/50 dark:text-green-200 border border-green-200 dark:border-green-800/50 shadow-sm">
          ✅ Supabase Conectado
        </span>
      </div>
    )
  }

  return (
    <div className="flex justify-center mb-4">
      <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full dark:bg-red-900/50 dark:text-red-200 border border-red-200 dark:border-red-800/50 shadow-sm">
        ❌ Erro no Supabase: {errorMessage}
      </span>
    </div>
  )
}
