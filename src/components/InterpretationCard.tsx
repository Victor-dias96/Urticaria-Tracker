'use client'

interface InterpretationCardProps {
  uas7Total: number
}

const LEVEL_RANGES = [
  { label: 'Controlada', score: 'UAS7 0', min: 0, max: 0, badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
  { label: 'Bem controlada', score: 'UAS7 1 - 6', min: 1, max: 6, badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { label: 'Leve', score: 'UAS7 7 - 15', min: 7, max: 15, badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { label: 'Moderada', score: 'UAS7 16 - 27', min: 16, max: 27, badge: 'bg-orange-100 text-orange-850 dark:bg-orange-950/70 dark:text-orange-300' },
  { label: 'Grave', score: 'UAS7 28 - 42', min: 28, max: 42, badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' }
]

export default function InterpretationCard({ uas7Total }: InterpretationCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 transition-all duration-300">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
        Interpretação do UAS7
      </h3>
      
      <div className="space-y-2.5">
        {LEVEL_RANGES.map((level) => {
          const isActive = uas7Total >= level.min && uas7Total <= level.max
          return (
            <div
              key={level.label}
              className={`
                flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300
                ${isActive 
                  ? 'bg-wine-50/70 dark:bg-wine-950/40 border-wine-300 dark:border-wine-800 shadow-sm scale-[1.02]' 
                  : 'bg-gray-50/30 dark:bg-gray-850/40 border-gray-100 dark:border-gray-800/60'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {level.score}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-wine-600 dark:bg-wine-400 animate-ping" />
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${level.badge}`}>
                {level.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
