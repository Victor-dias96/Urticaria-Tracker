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
  if (score === 3) return 'Grave'
  return 'Não preenchido'
}

const getSeverityStyles = (score: number | null) => {
  if (score === null || score === -1) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  if (score === 0) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
  if (score === 1) return 'bg-wine-50 text-wine-700 dark:bg-wine-950/40 dark:text-wine-300 border border-wine-100 dark:border-wine-900/30'
  if (score === 2) return 'bg-wine-100 text-wine-800 dark:bg-wine-900/40 dark:text-wine-200 border border-wine-200 dark:border-wine-800/40'
  return 'bg-wine-800 text-white dark:bg-wine-900 dark:text-wine-100'
}

export default function GaleriaPage() {
  const [dark, setDark] = useState(false)
  const [photos, setPhotos] = useState<UrticariaPhotoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Estado para controlar qual foto está expandida em tela cheia (Modal)
  const [selectedPhoto, setSelectedPhoto] = useState<UrticariaPhotoEntry | null>(null)
  // Estado para controlar a confirmação de exclusão
  const [photoToDelete, setPhotoToDelete] = useState<UrticariaPhotoEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sincroniza o estado do React com o que o layout.tsx já definiu no HTML
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
  }, [])

  // Função para alternar o tema salvando no localStorage e aplicando na raiz
  const toggleDarkMode = () => {
    const nextDark = !dark
    setDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // 1. Obter usuário autenticado
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.id) {
        setUserId(data.user.id)
      } else {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  // 2. Buscar fotos e fazer o Join manual com os sintomas mapeados pelo diário
  useEffect(() => {
    if (!userId) return

    const fetchPhotosAndScores = async () => {
      try {
        setLoading(true)

        // Puxa as fotos ordenadas pela data decrescente (mais recentes primeiro)
        const { data: photosData, error: photosError } = await supabase
          .from('urticaria_photos')
          .select('id, user_id, date, photo_url')
          .eq('user_id', userId)
          .order('date', { ascending: false })

        if (photosError) throw photosError

        if (!photosData || photosData.length === 0) {
          setPhotos([])
          return
        }

        // Mapeia todas as datas únicas que contêm fotos para fazer um lote de consulta reduzido
        const dates = Array.from(new Set(photosData.map(p => p.date)))

        // Puxa as notas de diário existentes para as datas em questão
        const { data: entriesData, error: entriesError } = await supabase
          .from('uas7_entries')
          .select('date, urticaria_score, coceira_score')
          .eq('user_id', userId)
          .in('date', dates)

        if (entriesError) throw entriesError

        // Transforma a resposta do diário num dicionário para busca rápida O(1)
        const entriesMap: Record<string, { urticaria: number | null; coceira: number | null }> = {}
        if (entriesData) {
          entriesData.forEach(entry => {
            entriesMap[entry.date] = {
              urticaria: entry.urticaria_score,
              coceira: entry.coceira_score
            }
          })
        }

        // Consolida os dois arrays aplicando o mapeamento
        const consolidatedData: UrticariaPhotoEntry[] = photosData.map(photo => {
          const matchedEntry = entriesMap[photo.date]
          return {
            ...photo,
            urticaria_score: matchedEntry ? matchedEntry.urticaria : null,
            coceira_score: matchedEntry ? matchedEntry.coceira : null
          }
        })

        setPhotos(consolidatedData)
      } catch (err) {
        console.error('Erro ao carregar galeria de fotos:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotosAndScores()
  }, [userId])

  // Função para deletar a foto do storage e do banco de dados
  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      setDeletingId(photoId)

      // Extrai o caminho relativo correto do arquivo dentro do bucket a partir da URL pública
      // Exemplo: .../storage/v1/object/public/urticaria-photos/pasta-usuario/nome-arquivo.jpg
      const urlParts = photoUrl.split('/urticaria-photos/')
      if (urlParts.length < 2) throw new Error('URL da foto inválida para exclusão no Storage.')
      const storagePath = urlParts[1]

      // 1. Deleta o arquivo no Bucket do Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('urticaria-photos')
        .remove([storagePath])

      if (storageError) {
        console.error('Aviso/Erro ao deletar no Storage:', storageError)
        // Seguimos adiante para limpar do banco caso o arquivo físico já tenha sumido por algum motivo
      }

      // 2. Deleta o registro na tabela do banco de dados (urticaria_photos)
      const { error: dbError } = await supabase
        .from('urticaria_photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      // 3. Atualiza o estado local da UI removendo a foto sem precisar recarregar tudo
      setPhotos(prev => prev.filter(p => p.id !== photoId))

      // Se a foto deletada estivesse aberta em tela cheia, fecha ela
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null)
      }
    } catch (e) {
      console.error('Erro ao excluir foto:', e)
      alert('Não foi possível excluir a foto. Tente novamente.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-rose-50/30 dark:bg-slate-900 transition-colors duration-300 pb-12">

      {/* CABEÇALHO DA GALERIA UNIFICADO */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-rose-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Botão ÚNICO de voltar (Seta + Texto juntos) */}
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-wine-700 dark:hover:text-rose-400 transition-colors duration-200"
          >
            <svg
              className="w-5 h-5 stroke-[2.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Voltar ao Diário</span>
          </Link>

          {/* Título Centralizado */}
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Galeria de Crises
          </h1>

          {/* Espaçador invisível à direita para manter o título perfeitamente centralizado */}
          <div className="w-[32px] sm:w-[120px] flex justify-end">
            {/* Se você quiser colocar o botão de Dark Mode aqui na galeria também, pode colar ele aqui. Caso contrário, deixe este bloco vazio como espaçador */}
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DA PÁGINA */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-wine-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Carregando seus registros visuais...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-rose-100 dark:border-gray-800 rounded-2xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-sm transition-colors duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-wine-600 dark:text-wine-400 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Nenhuma foto encontrada</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Você ainda não anexou nenhuma imagem às suas crises diárias no painel principal do diário.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm bg-wine-600 hover:bg-wine-700 text-white transition-colors shadow-sm shadow-wine-100 dark:shadow-none"
            >
              Registrar agora no Diário
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Seu Histórico de Lesões
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
                Total de {photos.length} {photos.length === 1 ? 'imagem capturada' : 'imagens capturadas'} no diário. Click em uma foto para ampliá-la.
              </p>
            </div>

            {/* MALA DE GRID DE IMAGENS TOTALMENTE RESPONSIVO */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {photos.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full relative"
                >
                  {/* Container da Foto com Efeito de Hover */}
                  <div
                    onClick={() => setSelectedPhoto(item)}
                    className="aspect-square w-full bg-slate-100 dark:bg-slate-800 relative cursor-zoom-in overflow-hidden shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.photo_url}
                      alt={`Registro de crise do dia ${item.date}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                      loading="lazy"
                    />

                    {/* Badge flutuante de data no canto superior esquerdo */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-lg tracking-wide">
                      {formatDate(item.date)}
                    </div>
                  </div>

                  {/* Detalhes Clínicos do Dia correspondente associados à foto */}
                  <div className="p-3 flex flex-col flex-grow justify-between gap-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Urticária</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${getSeverityStyles(item.urticaria_score)}`}>
                          {getSeverityText(item.urticaria_score)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Coceira</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${getSeverityStyles(item.coceira_score)}`}>
                          {getSeverityText(item.coceira_score)}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Exclusão Discreto por Card */}
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoToDelete(item)
                      }}
                      className="w-full text-center py-1 rounded-lg border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 active:bg-red-100 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir Registro
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* MODAL 1: VISUALIZADOR DE FOTO EM TELA CHEIA (ZOOM)    */}
      {/* ==================================================== */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in backdrop-blur-sm cursor-zoom-out"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Botão de fechar modal flutuante no topo direito */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors duration-200"
            aria-label="Fechar visualização"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="max-w-3xl w-full flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()} // impede fechar ao clicar na caixa interna
          >
            {/* Box da Imagem Principal */}
            <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl relative aspect-[4/3] sm:aspect-auto sm:max-h-[75vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.photo_url}
                alt="Registro ampliado"
                className="max-w-full max-h-[75vh] object-contain select-none"
              />
            </div>

            {/* Rodapé Informativo do Modal contendo as notas associadas */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div>
                <span className="font-bold text-gray-900 dark:text-white block text-base">
                  Registro Clínico de {formatDate(selectedPhoto.date)}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                  Mapeado em {selectedPhoto.date.split('-').reverse().join('/')}
                </span>
              </div>

              <div className="flex gap-2.5 shrink-0">
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-gray-800/50 border border-rose-100/40 dark:border-gray-700/60 rounded-xl flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Urticária:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getSeverityStyles(selectedPhoto.urticaria_score)}`}>
                    {getSeverityText(selectedPhoto.urticaria_score)}
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-gray-800/50 border border-rose-100/40 dark:border-gray-700/60 rounded-xl flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Coceira:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getSeverityStyles(selectedPhoto.coceira_score)}`}>
                    {getSeverityText(selectedPhoto.coceira_score)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: CONFIRMAÇÃO DE EXCLUSÃO SEGURA              */}
      {/* ==================================================== */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl text-center">

            {/* Ícone de Alerta */}
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
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
                Excluir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}