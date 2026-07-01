import { useTranslation } from 'react-i18next'
import type { Log, MealIntake, HydrationStatus } from '../../types'

const INTAKE_COLORS: Record<MealIntake, string> = {
  finished: '#7B9E87',
  partial: '#B8A030',
  refused: '#B07B7B',
  soft_only: '#9B8BB4',
  hydration: '#6B9B9E',
}

const HYDRATION_COLORS: Record<HydrationStatus, string> = {
  good: '#7B9E87',
  low: '#B8A030',
  refused: '#B07B7B',
}

export function MealChart({ logs, days = 30 }: { logs: Log[]; days?: number }) {
  const { t } = useTranslation()

  const byDay = new Map<string, Log[]>()
  for (const log of logs) {
    const key = new Date(log.logged_at).toDateString()
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(log)
  }

  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return { date: d, entries: byDay.get(d.toDateString()) ?? [] }
  })

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map(({ date, entries }) => (
          <div key={date.toISOString()} className="flex flex-col items-center gap-1">
            <div className="flex flex-wrap justify-center gap-0.5" style={{ minHeight: 16 }}>
              {entries.map((entry, i) =>
                entry.meal_intake ? (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: INTAKE_COLORS[entry.meal_intake] }}
                  />
                ) : null,
              )}
            </div>
            <div className="flex gap-0.5">
              {entries.map((entry, i) =>
                entry.hydration_status ? (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: HYDRATION_COLORS[entry.hydration_status] }}
                  />
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.keys(INTAKE_COLORS) as MealIntake[]).map((key) => (
          <span key={key} className="flex items-center gap-1.5 text-xs font-light text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INTAKE_COLORS[key] }} />
            {t(`meal_intake.${key}`)}
          </span>
        ))}
      </div>
    </div>
  )
}
