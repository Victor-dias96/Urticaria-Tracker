'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import UAS7Form from '@/components/UAS7Form'
import ActionButtons from '@/components/ActionButtons'
import InterpretationCard from '@/components/InterpretationCard'
import PhotoCapture from '@/components/PhotoCapture'

export type DayScore = { urticaria: number; itch: number }

const EMPTY_SCORES: DayScore[] = Array(7).fill({ urticaria: -1, itch: -1 })

export default function UAS7App() {
  const [dark, setDark] = useState(false)
  
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
   * Mapa de data (YYYY-MM-DD) → URL pública da foto salva no Supabase Storage.
   * Carregado junto com os scores ao buscar a semana; atualizado após cada upload.
   */
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

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

  // Fetch scores (and photo_url) from Supabase
  useEffect(() => {
    if (!startDate || !userId || weekDays.length === 0) return

    const loadScores = async () => {
      const dates = weekDays.map(d => d.fullDate)
      try {
        const { data, error } = await supabase
          .from('uas7_entries')
          // Inclui photo_url no SELECT para carregar miniaturas salvas anteriormente
          .select('date, urticaria_score, coceira_score, photo_url')
          .eq('user_id', userId)
          .in('date', dates)

        if (error) throw error

        const newScores = Array(7).fill(null).map(() => ({ urticaria: -1, itch: -1 }))
        const newPhotoUrls: Record<string, string> = {}

        if (data) {
          data.forEach(entry => {
            const idx = weekDays.findIndex(d => d.fullDate === entry.date)
            if (idx !== -1) {
              newScores[idx] = { 
                urticaria: entry.urticaria_score ?? -1, 
                itch: entry.coceira_score ?? -1 
              }
            }
            // Mapeia a URL da foto para a data correspondente (se existir)
            if (entry.photo_url) {
              newPhotoUrls[entry.date] = entry.photo_url
            }
          })
        }
        
        setScoresData({ week: startDate, scores: newScores })
        setPhotoUrls(newPhotoUrls)
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    }

    loadScores()
  }, [startDate, userId, weekDays])

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate)
  }

  useEffect(() => {
    const root = document.documentElement
    dark ? root.classList.add('dark') : root.classList.remove('dark')
  }, [dark])

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
      // Revertendo o estado em caso de erro (opcional, aqui mantemos simples e só damos o alert)
    }
  }

  /**
   * Callback disparado pelo PhotoCapture após upload bem-sucedido.
   * Persiste a `photo_url` no registro do banco de dados via upsert e atualiza o state local.
   *
   * @param publicUrl  - URL pública retornada pelo Supabase Storage
   * @param date       - Data no formato YYYY-MM-DD associada à foto (sempre hoje, decisão do produto)
   */
  const handlePhotoSaved = useCallback(async (publicUrl: string, date: string) => {
    if (!userId) return

    // Atualiza o state local imediatamente para feedback visual instantâneo
    setPhotoUrls(prev => ({ ...prev, [date]: publicUrl }))

    try {
      console.log('📸 Salvando photo_url no banco:', { date, publicUrl })

      // Upsert: se já existir entrada para esse user+date, atualiza apenas photo_url;
      // caso contrário, cria a linha com a URL (scores ficam null até o usuário preencher).
      const { error } = await supabase
        .from('uas7_entries')
        .upsert(
          {
            user_id: userId,
            date,
            photo_url: publicUrl,
          },
          { onConflict: 'user_id, date' }
        )

      if (error) {
        console.error('Erro ao salvar photo_url no banco:', error)
        // Não reverte o state local pois a foto já está no Storage;
        // o usuário pode recarregar para sincronizar.
      } else {
        console.log('✅ photo_url salva com sucesso no banco de dados!')
      }
    } catch (e) {
      console.error('Erro inesperado ao salvar photo_url:', e)
    }
  }, [userId])

  // Data de hoje no formato YYYY-MM-DD (usada pelo PhotoCapture para associar a foto)
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
        onToggleDark={() => setDark(d => !d)} 
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
              savedPhotoUrl={photoUrls[todayDate] ?? null}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
