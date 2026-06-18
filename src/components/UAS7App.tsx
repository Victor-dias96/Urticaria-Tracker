'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import UAS7Form from '@/components/UAS7Form'
import ActionButtons from '@/components/ActionButtons'
import InterpretationCard from '@/components/InterpretationCard'
import PhotoCapture from '@/components/PhotoCapture'

export type DayScore = { urticaria: number; itch: number }

const WEEK_DAYS = [
  { short: 'Seg', date: '30/06' },
  { short: 'Ter', date: '01/07' },
  { short: 'Qua', date: '02/07' },
  { short: 'Qui', date: '03/07' },
  { short: 'Sex', date: '04/07' },
  { short: 'Sáb', date: '05/07' },
  { short: 'Dom', date: '06/07' },
]

const INITIAL_SCORES: DayScore[] = [
  { urticaria: 0, itch: 0 },  // Seg — unset
  { urticaria: 1, itch: 1 },  // Ter
  { urticaria: 2, itch: 1 },  // Qua
  { urticaria: 1, itch: 2 },  // Qui
  { urticaria: 3, itch: 2 },  // Sex
  { urticaria: 2, itch: 3 },  // Sáb
  { urticaria: -1, itch: -1 }, // Dom — não preenchido
]

export default function UAS7App() {
  const [dark, setDark] = useState(false)
  const [scores, setScores] = useState<DayScore[]>(INITIAL_SCORES)

  useEffect(() => {
    const root = document.documentElement
    dark ? root.classList.add('dark') : root.classList.remove('dark')
  }, [dark])

  const setScore = (dayIdx: number, field: 'urticaria' | 'itch', value: number) => {
    setScores(prev => {
      const next = [...prev]
      const currentValue = next[dayIdx][field]
      // Toggle logic: reset to -1 if clicking already selected option, else set to value
      next[dayIdx] = {
        ...next[dayIdx],
        [field]: currentValue === value ? -1 : value
      }
      return next
    })
  }

  const filledDays = scores.filter(s => s.urticaria !== -1 && s.itch !== -1).length

  const uas7Total = scores.reduce((sum, s) => {
    if (s.urticaria === -1 || s.itch === -1) return sum
    return sum + s.urticaria + s.itch
  }, 0)

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-gray-950 transition-colors duration-300">
      <Header dark={dark} onToggleDark={() => setDark(d => !d)} />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Form section — full width */}
        <UAS7Form
          weekDays={WEEK_DAYS}
          scores={scores}
          onSetScore={setScore}
          filledDays={filledDays}
          uas7Total={uas7Total}
        />

        {/* Bottom section: desktop 2-col, mobile stack */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-4 lg:w-[480px] xl:w-[520px] shrink-0">
            <ActionButtons />
            <InterpretationCard uas7Total={uas7Total} />
          </div>
          {/* Right column */}
          <div className="flex-1">
            <PhotoCapture />
          </div>
        </div>
      </main>
    </div>
  )
}
