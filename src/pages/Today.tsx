import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useElders } from '../hooks/useElders'
import { useLogFeed } from '../hooks/useLogs'
import { useMedicationDue } from '../hooks/useMedicationDue'
import { TodayFeed } from '../components/TodayFeed'
import { AlertBanner } from '../components/AlertBanner'
import { CARD_TYPES } from '../types'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

const CARD_EMOJI: Record<string, string> = {
  medications: '💊',
  blood_pressure: '❤️',
  body_temperature: '🌡️',
  blood_sugar: '🩸',
  wound_care: '🩹',
  meal_log: '🍽️',
}

export default function Today() {
  const { t, i18n } = useTranslation()
  const { elders, selectedElder, selectedElderId, selectElder } = useElders()
  // 3-day fetch so the medication-due check has context, but the feed itself
  // must only show today — otherwise yesterday's rows linger after midnight.
  const { logs, loading, patchLocal, removeLocal } = useLogFeed(selectedElderId, 3)

  const todayLogs = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return logs.filter((l) => new Date(l.logged_at) >= startOfDay)
  }, [logs])

  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'
  const dateStr = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())

  const todayCounts = useMemo(() => {
    const today = new Date().toDateString()
    const counts: Record<string, number> = {}
    for (const log of logs) {
      if (new Date(log.logged_at).toDateString() !== today) continue
      counts[log.card_type] = (counts[log.card_type] ?? 0) + 1
    }
    return counts
  }, [logs])

  const medicationLogs = useMemo(() => logs.filter((l) => l.card_type === 'medications'), [logs])
  const medicationDue = useMedicationDue(selectedElderId, medicationLogs)

  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-surface px-6 pb-5 pt-8">
        <p className="brand-label text-xs">{t('brand')}</p>
        <div className="mt-4 flex items-center gap-3">
          {selectedElder?.photo_url ? (
            <img src={selectedElder.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-sm font-light text-text-secondary">
              {selectedElder?.name?.charAt(0) ?? '?'}
            </div>
          )}
          <div>
            <p className="text-base font-light text-text-primary">{selectedElder?.name}</p>
            <p className="text-xs font-light text-text-secondary">{dateStr}</p>
          </div>
          {elders.length > 1 && (
            <select
              value={selectedElderId ?? ''}
              onChange={(e) => selectElder(e.target.value)}
              className="ml-auto rounded-full border border-divider bg-bg px-3 py-1.5 text-xs font-light"
            >
              {elders.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Fixed six-column grid so the chips always fit one row on phones */}
        <div className="mt-5 grid grid-cols-6 gap-1.5">
          {CARD_TYPES.map((ct) => (
            <span
              key={ct}
              className="flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-bg px-1 py-1.5 text-xs font-light text-text-secondary"
            >
              <span>{CARD_EMOJI[ct]}</span>
              {todayCounts[ct] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {medicationDue && (
        <div className="pt-4">
          <AlertBanner message={t('today_screen.medications_due')} />
        </div>
      )}

      <div className="mt-2">
        {loading ? (
          <p className="px-6 py-10 text-center text-sm font-light text-text-muted">{t('common.loading')}</p>
        ) : (
          <TodayFeed logs={todayLogs} onEdited={patchLocal} onDeleted={removeLocal} />
        )}
      </div>
    </div>
  )
}
