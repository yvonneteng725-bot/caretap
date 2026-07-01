import { useTranslation } from 'react-i18next'
import { CARD_ACCENTS } from '../types'
import type { Log } from '../types'
import { CARD_ICONS } from './icons'
import { AlertPill } from './AlertBanner'
import { checkAlert } from '../lib/alerts'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

export function TodayFeed({ logs }: { logs: Log[] }) {
  const { t, i18n } = useTranslation()
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'

  if (logs.length === 0) {
    return <p className="px-6 py-10 text-center text-sm font-light text-text-muted">{t('history.no_data')}</p>
  }

  return (
    <div className="flex flex-col">
      {logs.map((log) => {
        const Icon = CARD_ICONS[log.card_type]
        const accent = CARD_ACCENTS[log.card_type]
        const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
          new Date(log.logged_at),
        )
        const alert = checkAlert(log)

        return (
          <div key={log.id} className="flex items-start gap-3 px-6 py-4" style={{ borderBottom: '0.5px solid rgba(200,184,154,0.25)' }}>
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
              <div style={{ transform: 'scale(0.3)' }}>
                <Icon color={accent.accent} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-light text-text-primary">{t(`card_types.${log.card_type}`)}</span>
                <span className="text-xs font-light text-text-muted">{time}</span>
                {log.logged_by_name && (
                  <span className="text-xs font-light text-text-muted">· {log.logged_by_name}</span>
                )}
                {alert && <AlertPill label={t('alerts.high_badge')} />}
              </div>
              {log.note && <p className="mt-1 text-xs font-light text-text-secondary">{log.note}</p>}
            </div>
            {log.photo_url && (
              <img src={log.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            )}
          </div>
        )
      })}
    </div>
  )
}
