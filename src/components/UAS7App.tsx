'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import UAS7Form from '@/components/UAS7Form'
import ActionButtons from '@/components/ActionButtons'
import InterpretationCard from '@/components/InterpretationCard'
import PhotoCapture from '@/components/PhotoCapture'

export type DayScore = { urticaria: number; itch: number }

export interface PhotoRecord {
  id: string
  url: string
}

const EMPTY_SCORES: DayScore[] = Array(7).fill({ urticaria: -1, itch: -1 })

export default function UAS7App() {
  const [dark, setDark] = useState(false)

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

  // Dynamic Start Date (defaults to today)
  const [startDate, setStartDate] = useState(() => {
    // We use a simple YYYY-MM-DD string to bind to <input type="date">
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  // Dynamic computation of the 7 days based on startDate
  const [weekDays, setWeekDays] = useState<{ short: string; date: string; fullDate: string }[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (user?.id) {
        setUserId(user.id)
      }
    }
    fetchUser()
  }, [])

  const [scoresData, setScoresData] = useState<{ week: string; scores: DayScore[] }>({
    week: '',
    scores: EMPTY_SCORES
  })

  /**
   * Mapa de data (YYYY-MM-DD) → Lista de registros de fotos salvas no Supabase.
   * Carregado junto com os scores ao buscar a semana; atualizado após cada upload/deleção.
   */
  const [photoUrls, setPhotoUrls] = useState<Record<string, PhotoRecord[]>>({})

  // Deriva o estado de scores correspondente à semana selecionada
  const scores = scoresData.week === startDate ? scoresData.scores : EMPTY_SCORES

  useEffect(() => {
    if (!startDate) return
    const start = new Date(startDate + 'T00:00:00')
    const days = []
    const shortNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const short = shortNames[d.getDay()]
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const fullDate = d.toISOString().split('T')[0]
      days.push({ short, date: dateStr, fullDate })
    }
    setWeekDays(days)
  }, [startDate])

  // Fetch scores (from uas7_entries) and photos (from urticaria_photos) from Supabase
  useEffect(() => {
    if (!startDate || !userId || weekDays.length === 0) return

    const loadScoresAndPhotos = async () => {
      const dates = weekDays.map(d => d.fullDate)
      try {
        // Busca notas do diário
        const { data: entriesData, error: entriesError } = await supabase
          .from('uas7_entries')
          .select('date, urticaria_score, coceira_score')
          .eq('user_id', userId)
          .in('date', dates)

        if (entriesError) throw entriesError

        // Busca todas as fotos salvas para o período da semana correspondente
        const { data: photosData, error: photosError } = await supabase
          .from('urticaria_photos')
          .select('id, date, photo_url')
          .eq('user_id', userId)
          .in('date', dates)
          .order('created_at', { ascending: true }) // Ordem cronológica das fotos do dia

        if (photosError) throw photosError

        const newScores = Array(7).fill(null).map(() => ({ urticaria: -1, itch: -1 }))
        const newPhotoUrls: Record<string, PhotoRecord[]> = {}

        if (entriesData) {
          entriesData.forEach(entry => {
            const idx = weekDays.findIndex(d => d.fullDate === entry.date)
            if (idx !== -1) {
              newScores[idx] = {
                urticaria: entry.urticaria_score ?? -1,
                itch: entry.coceira_score ?? -1
              }
            }
          })
        }

        if (photosData) {
          photosData.forEach(photo => {
            if (!newPhotoUrls[photo.date]) {
              newPhotoUrls[photo.date] = []
            }
            newPhotoUrls[photo.date].push({ id: photo.id, url: photo.photo_url })
          })
        }

        setScoresData({ week: startDate, scores: newScores })
        setPhotoUrls(newPhotoUrls)
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    }

    loadScoresAndPhotos()
  }, [startDate, userId, weekDays])

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate)
  }

  const setScore = async (dayIdx: number, field: 'urticaria' | 'itch', value: number) => {
    if (!userId) {
      alert("Usuário não autenticado. Faça login para salvar suas notas.");
      return;
    }

    const currentScore = scores[dayIdx]
    const newValue = currentScore[field] === value ? -1 : value

    // Optimistic UI update
    setScoresData(prev => {
      const nextScores = [...prev.scores]
      nextScores[dayIdx] = {
        ...nextScores[dayIdx],
        [field]: newValue
      }
      return {
        week: prev.week,
        scores: nextScores
      }
    })

    // Prepare data for save
    const fullDate = weekDays[dayIdx].fullDate;
    const newUrticaria = field === 'urticaria' ? newValue : currentScore.urticaria;
    const newItch = field === 'itch' ? newValue : currentScore.itch;

    const payload = {
      user_id: userId,
      date: fullDate,
      urticaria_score: newUrticaria === -1 ? null : Number(newUrticaria),
      coceira_score: newItch === -1 ? null : Number(newItch),
    };

    try {
      console.log("🚀 Payload enviado ao Supabase:", payload);
      // Upsert using onConflict if the DB has a constraint on user_id and date
      const { error } = await supabase
        .from('uas7_entries')
        .upsert(payload, {
          onConflict: 'user_id, date'
        });

      if (error) {
        // Fallback se onConflict não funcionar por falta de constraint única
        if (error.code === 'PGRST116' || error.message.includes('constraint')) {
          const { data: existing } = await supabase
            .from('uas7_entries')
            .select('id')
            .eq('user_id', userId)
            .eq('date', fullDate)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await supabase
              .from('uas7_entries')
              .update({
                urticaria_score: payload.urticaria_score,
                coceira_score: payload.coceira_score,
              })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('uas7_entries')
              .insert(payload);
            if (insertError) throw insertError;
          }
        } else {
          throw error;
        }
      }

      // Feedback visual opcional: Console log para dev
      console.log('Nota salva com sucesso!');
    } catch (e) {
      console.error('Erro ao salvar no banco:', e);
      alert('Houve um erro ao salvar sua nota. Tente novamente.');
    }
  }

  /**
   * Callback disparado pelo PhotoCapture após upload bem-sucedido.
   */
  const handlePhotoSaved = useCallback(async (publicUrl: string, date: string): Promise<string | null> => {
    if (!userId) return null

    try {
      console.log('📸 Salvando photo_url no banco (urticaria_photos):', { date, publicUrl })

      const { data, error } = await supabase
        .from('urticaria_photos')
        .insert({
          user_id: userId,
          date,
          photo_url: publicUrl,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Erro ao salvar photo_url no banco (urticaria_photos):', error)
        alert('Erro ao salvar o registro da foto no banco de dados.')
        return null
      } else if (data) {
        console.log('✅ photo_url salva com sucesso no banco de dados (urticaria_photos)!')
        const newId = data.id
        setPhotoUrls(prev => {
          const currentList = prev[date] ?? []
          if (currentList.some(item => item.id === newId)) return prev
          return { ...prev, [date]: [...currentList, { id: newId, url: publicUrl }] }
        })
        return newId
      }
      return null
    } catch (e) {
      console.error('Erro inesperado ao salvar photo_url:', e)
      return null
    }
  }, [userId])

  /**
   * Callback disparado pelo PhotoCapture após deleção bem-sucedida.
   */
  const handlePhotoDeleted = useCallback((photoId: string, date: string) => {
    setPhotoUrls(prev => {
      const currentList = prev[date] ?? []
      return { ...prev, [date]: currentList.filter(p => p.id !== photoId) }
    })
  }, [])

  // Data de hoje no formato YYYY-MM-DD
  const todayDate = new Date().toISOString().split('T')[0]

  const filledDays = scores.filter(s => s.urticaria !== -1 && s.itch !== -1).length

  const uas7Total = scores.reduce((sum, s) => {
    if (s.urticaria === -1 || s.itch === -1) return sum
    return sum + s.urticaria + s.itch
  }, 0)

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-gray-950 transition-colors duration-300">
      <Header
        dark={dark}
        onToggleDark={toggleDarkMode}
        startDate={startDate}
        onStartDateChange={handleStartDateChange}
      />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">

        {/* Form section — full width */}
        <UAS7Form
          weekDays={weekDays}
          scores={scores}
          onSetScore={setScore}
          filledDays={filledDays}
          uas7Total={uas7Total}
        />

        {/* Bottom section: desktop 2-col, mobile stack */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-4 lg:w-[480px] xl:w-[520px] shrink-0">
            <ActionButtons scores={scores} weekDays={weekDays} uas7Total={uas7Total} />
            <InterpretationCard uas7Total={uas7Total} />
          </div>
          {/* Right column */}
          <div className="flex-1">
            <PhotoCapture
              userId={userId}
              selectedDate={todayDate}
              onPhotoSaved={handlePhotoSaved}
              onPhotoDeleted={handlePhotoDeleted}
              savedPhotos={photoUrls[todayDate] ?? []}
            />
          </div>
        </div>
      </main>
    </div>
  )
}