import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { useElders } from '../hooks/useElders'
import { useLogFeed } from '../hooks/useLogs'
import { CARD_TYPES, CARD_ACCENTS } from '../types'
import type { CardType } from '../types'
import { VitalsChart } from '../components/charts/VitalsChart'
import { CalendarHeatmap } from '../components/charts/CalendarHeatmap'
import { MealChart } from '../components/charts/MealChart'
import { TodayFeed } from '../components/TodayFeed'
import { openReportForPrint } from '../lib/exportReport'

type Filter = 'all' | CardType

export default function History() {
  const { t, i18n } = useTranslation()
  const { selectedElder, selectedElderId } = useElders()
  const [filter, setFilter] = useState<Filter>('all')
  const { logs, loading, reload } = useLogFeed(selectedElderId, 30, filter === 'all' ? undefined : filter)

  return (
    <div className="min-h-screen bg-bg px-4 pb-10 pt-8">
      <div className="flex items-center justify-between px-2">
        <p className="brand-label text-xs">{t('brand')}</p>
        <button
          onClick={() => selectedElder && openReportForPrint(selectedElder, logs, 30)}
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-light text-text-secondary shadow-card"
        >
          <Download size={13} strokeWidth={1.5} />
          {t('history.export')}
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-2 pb-1">
        {(['all', ...CARD_TYPES] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-light transition-colors ${
              filter === f ? 'bg-medications-accent text-white' : 'bg-surface text-text-secondary'
            }`}
          >
            {f === 'all' ? t('history.last_30') : t(`card_types.${f}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-card bg-surface p-4 shadow-card">
        {loading ? (
          <p className="py-10 text-center text-sm font-light text-text-muted">{t('common.loading')}</p>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm font-light text-text-muted">{t('history.no_data')}</p>
        ) : filter === 'all' ? (
          <TodayFeed logs={logs} showDate onChanged={reload} />
        ) : filter === 'blood_pressure' || filter === 'body_temperature' || filter === 'blood_sugar' ? (
          <VitalsChart logs={logs} variant={filter} locale={i18n.language} />
        ) : filter === 'meal_log' ? (
          <MealChart logs={logs} />
        ) : (
          <CalendarHeatmap logs={logs} accent={CARD_ACCENTS[filter].accent} />
        )}
      </div>
    </div>
  )
}
