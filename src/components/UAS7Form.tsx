'use client'
import { DayScore } from './UAS7App'

interface UAS7FormProps {
  weekDays: { short: string; date: string }[]
  scores: DayScore[]
  onSetScore: (dayIdx: number, field: 'urticaria' | 'itch', value: number) => void
  filledDays: number
  uas7Total: number
}

const SCORE_LABELS = [
  { val: 0, label: 'Nenhuma', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  { val: 1, label: 'Leve', bg: 'bg-wine-100 dark:bg-wine-950/40 text-wine-700 dark:text-wine-300' },
  { val: 2, label: 'Moderada', bg: 'bg-wine-200 dark:bg-wine-900/50 text-wine-800 dark:text-wine-200' },
  { val: 3, label: 'Grave', bg: 'bg-wine-800 dark:bg-wine-900 text-white dark:text-wine-100' }
]

export default function UAS7Form({
  weekDays,
  scores,
  onSetScore,
  filledDays,
  uas7Total
}: UAS7FormProps) {
  const firstDay = weekDays[0]?.date || ''
  const lastDay = weekDays[6]?.date || ''

  return (
    <div id="uas7-form-capture" className="w-full bg-white dark:bg-gray-900 rounded-2xl ...">
      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Formulário UAS7 — Semana de {firstDay} a {lastDay}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Preencha diariamente. Entregue ao seu médico ao final de 7 dias consecutivos.
          </p>
        </div>

        {/* Progress Badge */}
        <div className="self-start sm:self-center flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-wine-50 dark:bg-wine-950 border border-wine-100 dark:border-wine-800/80 text-wine-700 dark:text-wine-300 text-xs font-semibold shrink-0">
          <svg className="w-4 h-4 animate-pulse-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {filledDays} de 7 dias preenchidos
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 pb-5 mb-5 border-b border-gray-100 dark:border-gray-800 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-1">Legenda:</span>
        {SCORE_LABELS.map(s => (
          <span key={s.val} className={`px-2.5 py-1 rounded-md font-medium ${s.bg}`}>
            {s.label} ({s.val})
          </span>
        ))}
      </div>

      {/* UAS7 Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle p-4 sm:p-0">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <th scope="col" className="text-left pb-2 pl-3">Data</th>
                <th scope="col" className="text-center pb-2 px-4">
                  <span className="text-wine-700 dark:text-wine-400 block sm:inline">URTICÁRIAS</span>
                  <span className="text-[9px] text-gray-400 block font-normal normal-case">Nenhuma • Leve • Moderada • Grave</span>
                </th>
                <th scope="col" className="text-center pb-2 px-4">
                  <span className="text-wine-700 dark:text-wine-400 block sm:inline">COCEIRA</span>
                  <span className="text-[9px] text-gray-400 block font-normal normal-case">Nenhuma • Leve • Moderada • Grave</span>
                </th>
                <th scope="col" className="text-right pb-2 pr-3">PONTOS</th>
              </tr>
            </thead>

            <tbody>
              {weekDays.map((day, idx) => {
                const score = scores[idx]
                const daySum = (score.urticaria === -1 || score.itch === -1) ? '—' : (score.urticaria + score.itch)

                return (
                  <tr
                    key={day.short}
                    className="bg-gray-50/50 dark:bg-gray-850 hover:bg-gray-100/30 dark:hover:bg-gray-800/40 rounded-xl transition-colors duration-150"
                  >
                    {/* Date label */}
                    <td className="py-3 pl-4 rounded-l-xl">
                      <div className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-tight">
                        {day.short}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-medium">
                        {day.date}
                      </div>
                    </td>

                    {/* Urticaria Buttons */}
                    <td className="py-3 px-2 sm:px-4 text-center">
                      <div className="flex justify-center gap-1 sm:gap-2">
                        {SCORE_LABELS.map(opt => {
                          const isSelected = score.urticaria === opt.val
                          return (
                            <button
                              key={opt.val}
                              onClick={() => onSetScore(idx, 'urticaria', opt.val)}
                              className={`
                                flex items-center justify-center transition-all duration-200
                                ${isSelected
                                  ? 'bg-wine-800 dark:bg-wine-700 text-white font-bold ring-2 ring-wine-300 dark:ring-wine-900 scale-105'
                                  : 'bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }
                                /* Mobile-first circle style */
                                rounded-full w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg text-xs sm:font-medium
                              `}
                            >
                              <span className="sm:hidden">{opt.val}</span>
                              <span className="hidden sm:inline">
                                <span className="font-bold mr-1">{opt.val}</span> {opt.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </td>

                    {/* Itch Buttons */}
                    <td className="py-3 px-2 sm:px-4 text-center">
                      <div className="flex justify-center gap-1 sm:gap-2">
                        {SCORE_LABELS.map(opt => {
                          const isSelected = score.itch === opt.val
                          return (
                            <button
                              key={opt.val}
                              onClick={() => onSetScore(idx, 'itch', opt.val)}
                              className={`
                                flex items-center justify-center transition-all duration-200
                                ${isSelected
                                  ? 'bg-wine-800 dark:bg-wine-700 text-white font-bold ring-2 ring-wine-300 dark:ring-wine-900 scale-105'
                                  : 'bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }
                                /* Mobile-first circle style */
                                rounded-full w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg text-xs sm:font-medium
                              `}
                            >
                              <span className="sm:hidden">{opt.val}</span>
                              <span className="hidden sm:inline">
                                <span className="font-bold mr-1">{opt.val}</span> {opt.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </td>

                    {/* Day Score Total */}
                    <td className="py-3 pr-4 text-right rounded-r-xl font-bold text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                      {daySum}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Banner - UAS7 score summary */}
      <div className="mt-5 p-4 rounded-xl bg-wine-50 dark:bg-wine-950/30 border border-wine-100 dark:border-wine-900/40 flex items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-wine-700 dark:text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
          <span className="text-sm sm:text-base font-bold text-wine-800 dark:text-wine-300">
            UAS7 (Soma dos 7 dias)
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-extrabold text-wine-700 dark:text-wine-400 leading-none">
            {uas7Total}
          </span>
          <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 font-medium ml-1">
            / 42
          </span>
        </div>
      </div>
    </div>
  )
}
