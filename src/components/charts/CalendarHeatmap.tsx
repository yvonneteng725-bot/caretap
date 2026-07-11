import type { Log } from '../../types'

interface Props {
  logs: Log[]
  accent: string
  days?: number
}

export function CalendarHeatmap({ logs, accent, days = 30 }: Props) {
  const loggedDates = new Set(logs.map((l) => new Date(l.logged_at).toDateString()))

  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return { date: d, logged: loggedDates.has(d.toDateString()) }
  })

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map(({ date, logged }) => (
        <div
          key={date.toISOString()}
          title={date.toLocaleDateString()}
          className="flex aspect-square items-center justify-center rounded-md text-xs font-light"
          style={{
            backgroundColor: logged ? accent : 'rgba(200,184,154,0.15)',
            color: logged ? '#FFFFFF' : '#9A8C7E',
          }}
        >
          {date.getDate()}
        </div>
      ))}
    </div>
  )
}
