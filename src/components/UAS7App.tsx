'use client'
import { useState, useEffect } from 'react'
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
  const [weekDays, setWeekDays] = useState<{ short: string; date: string }[]>([])
  const [scores, setScores] = useState<DayScore[]>(EMPTY_SCORES)

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
      days.push({ short, date: dateStr })
    }
    setWeekDays(days)
  }, [startDate])

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate)
    setScores(EMPTY_SCORES) // Reset scores when week changes
  }



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
