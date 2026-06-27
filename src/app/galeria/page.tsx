'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Interface correspondendo aos dados de foto e diário associado
interface UrticariaPhotoEntry {
  id: string
  user_id: string
  date: string
  photo_url: string
  urticaria_score: number | null
  coceira_score: number | null
}

// Formatar data localmente para evitar desvios de fuso horário indesejados
const formatDate = (dateString: string) => {
  try {
    const [year, month, day] = dateString.split('-')
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    const formatted = date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
    // Capitaliza primeira letra (ex: "sex, 26/06" -> "Sex, 26/06")
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace('.', '')
  } catch (e) {
    return dateString
  }
}

const getSeverityText = (score: number | null) => {
  if (score === null || score === -1) return 'Não preenchido'
  if (score === 0) return 'Nenhuma'
  if (score === 1) return 'Leve'
  if (score === 2) return 'Moderada'
  if (score === 3) return 'Intensa'
  return ''
}

const getSeverityColor = (score: number | null) => {
  if (score === null || score === -1) {
    return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }
  if (score === 0) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
  }
  if (score === 1) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
  }
  if (score === 2) {
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50'
  }
  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50'
}

export default function GaleriaPage() {
  const [entries, setEntries] = useState<UrticariaPhotoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dark, setDark] = useState(false)

  // Estado para controlar o Pop-up de Exclusão
  const [photoToDelete, setPhotoToDelete] = useState<UrticariaPhotoEntry | null>(null)

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      const marker = '/urticaria-photos/'
      const index = photoUrl.indexOf(marker)
      if (index === -1) {
        throw new Error('URL da foto inválida ou fora do bucket esperado.')
      }
      const filePath = decodeURIComponent(photoUrl.substring(index + marker.length))

      // 1. Remove o arquivo do Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('urticaria-photos')
        .remove([filePath])

      if (storageError) {
        throw storageError
      }

      // 2. Remove o registro do Banco de Dados
      const { error: dbError } = await supabase
        .from('urticaria_photos')
        .delete()
        .eq('id', photoId)

      if (dbError) {
        throw dbError
      }

      // 3. Atualiza UI local (A foto some da tela instantaneamente)
      setEntries(prev => prev.filter(entry => entry.id !== photoId))

    } catch (err: any) {
      console.error('Erro ao excluir foto:', err)
      alert(`Erro ao excluir foto: ${err.message || 'Erro desconhecido'}`)
    }
  }

  // Sincroniza o estado de Dark Mode com o tema ativo na tag html
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [dark])

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError

        if (!user) {
          setError('Usuário não autenticado.')
          setLoading(false)
          return
        }

        // 1. Busca todas as fotos da tabela urticaria_photos ordenando por criadas mais recentemente
        const { data: photos, error: dbError } = await supabase
          .from('urticaria_photos')
          .select('id, user_id, date, photo_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (dbError) throw dbError

        if (!photos || photos.length === 0) {
          setEntries([])
          setLoading(false)
          return
        }

        // 2. Extrai as datas únicas das fotos para buscar as notas correspondentes do diário em lote
        const uniqueDates = Array.from(new Set(photos.map(p => p.date)))

        const { data: diaryEntries, error: diaryError } = await supabase
          .from('uas7_entries')
          .select('date, urticaria_score, coceira_score')
          .eq('user_id', user.id)
          .in('date', uniqueDates)

        if (diaryError) throw diaryError

        // Mapeia os diários por data para pesquisa rápida O(1)
        const diaryMap = new Map<string, { urticaria_score: number | null; coceira_score: number | null }>()
        if (diaryEntries) {
          diaryEntries.forEach(entry => {
            diaryMap.set(entry.date, {
              urticaria_score: entry.urticaria_score,
              coceira_score: entry.coceira_score
            })
          })
        }

        // 3. Junta as fotos com os sintomas (badges) obtidos do diário
        const mergedEntries: UrticariaPhotoEntry[] = photos.map(photo => {
          const diary = diaryMap.get(photo.date)
          return {
            id: photo.id,
            user_id: photo.user_id,
            date: photo.date,
            photo_url: photo.photo_url,
            urticaria_score: diary ? diary.urticaria_score : null,
            coceira_score: diary ? diary.coceira_score : null
          }
        })

        setEntries(mergedEntries)
      } catch (err: any) {
        console.error('Erro ao carregar galeria:', err)
        setError('Não foi possível carregar a galeria de fotos.')
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [])

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      {/* Header Simplificado da Galeria */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-rose-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-wine-700 dark:text-wine-300">
              Galeria de Crises
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle dark mode */}
            <button
              onClick={() => setDark(d => !d)}
              aria-label="Alternar tema claro/escuro"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105"
            >
              {dark ? (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center bg-wine-50 dark:bg-wine-950/30 hover:bg-wine-100 dark:hover:bg-wine-900/50 text-wine-700 dark:text-wine-300 px-3.5 h-9 rounded-lg text-sm font-semibold transition-colors duration-200 border border-wine-200 dark:border-wine-800"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-wine-700 dark:text-wine-300">
            Galeria de Fotos do Diário
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Histórico visual dos sintomas e registros fotográficos associados aos scores do diário clínico.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm shadow-sm">
            {error}
          </div>
        )}

        {/* Carregando (Skeleton Loaders) */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col gap-3 animate-pulse bg-white dark:bg-gray-900 rounded-2xl p-3 border border-rose-100/50 dark:border-gray-800 shadow-sm">
                <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mt-2" />
                <div className="flex gap-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-md w-1/2" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sem fotos registradas */}
        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm max-w-md mx-auto">
            <div className="w-16 h-16 mb-4 bg-rose-50 dark:bg-rose-950/50 rounded-full flex items-center justify-center text-wine-500 dark:text-wine-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              Você ainda não possui fotos registradas.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 max-w-xs">
              Adicione fotos das crises no painel principal utilizando a seção de fotos diárias.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center justify-center bg-wine-600 hover:bg-wine-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Ir para o Painel
            </Link>
          </div>
        )}

        {/* Grid de Fotos do Diário (2 a 3 colunas) */}
        {!loading && !error && entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-rose-100/50 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Imagem uniforme usando object-cover */}
                <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-950 overflow-hidden">
                  <img
                    src={entry.photo_url}
                    alt={`Registro de Urticária em ${formatDate(entry.date)}`}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Botão de Excluir que abre o Modal */}
                  <button
                    onClick={() => setPhotoToDelete(entry)}
                    title="Excluir foto"
                    className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-all duration-150 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Data formatada e scores UAS7 logo abaixo da imagem */}
                <div className="p-3 sm:p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded">
                      {formatDate(entry.date)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {/* Score Urticária */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Urticária</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium border text-[10px] ${getSeverityColor(entry.urticaria_score)}`}>
                        {entry.urticaria_score !== null && entry.urticaria_score !== -1 ? entry.urticaria_score : '-'} • {getSeverityText(entry.urticaria_score)}
                      </span>
                    </div>

                    {/* Score Coceira */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Coceira</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium border text-[10px] ${getSeverityColor(entry.coceira_score)}`}>
                        {entry.coceira_score !== null && entry.coceira_score !== -1 ? entry.coceira_score : '-'} • {getSeverityText(entry.coceira_score)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* POP-UP CUSTOMIZADO DE CONFIRMAÇÃO */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all scale-100 p-6">

            {/* Ícone de Alerta Superior */}
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            {/* Textos Informativos */}
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Confirmar Exclusão?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                Deseja mesmo excluir esta foto do seu diário? Esta ação é permanente e não poderá ser desfeita.
              </p>
            </div>

            {/* Botões de Ação Responsivos */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 rounded-xl transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDeletePhoto(photoToDelete.id, photoToDelete.photo_url);
                  setPhotoToDelete(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-sm shadow-red-100 dark:shadow-none transition-colors duration-200"
              >
                Sim, Excluir
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}