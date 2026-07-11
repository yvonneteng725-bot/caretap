import { useTranslation } from 'react-i18next'
import type { CardType } from '../types'
import { CARD_ACCENTS } from '../types'
import { CARD_ICONS } from './icons'
import { hexToRgba } from '../lib/color'
import { AlertBanner } from './AlertBanner'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

interface Props {
  cardType: CardType
  loggedAt: string
  todayCount: number
  alertMessage?: string | null
  saveErrorMessage?: string | null
  note: string
  onNoteChange: (note: string) => void
  photoSlot?: React.ReactNode
  onBackHome: () => void
  onUndo?: () => void
}

export function ConfirmationScreen({
  cardType,
  loggedAt,
  todayCount,
  alertMessage,
  saveErrorMessage,
  note,
  onNoteChange,
  photoSlot,
  onBackHome,
  onUndo,
}: Props) {
  const { t, i18n } = useTranslation()
  const accent = CARD_ACCENTS[cardType]
  const Icon = CARD_ICONS[cardType]

  const date = new Date(loggedAt)
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'
  const timeStr = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
  const dateStr = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long' }).format(date)

  return (
    <div
      className="relative flex min-h-screen flex-col items-center px-6 pb-10 pt-8"
      style={{
        background: `linear-gradient(to bottom, #FAFAF7 0%, #FAFAF7 55%, ${hexToRgba(accent.accent, 0.16)} 68%, ${hexToRgba(accent.accent, 0.16)} 100%)`,
      }}
    >
      <p className="brand-label text-xs">{t('brand')}</p>

      <div className="ct-pop mt-10" style={{ transform: 'scale(1.6)' }}>
        <Icon color={accent.accent} />
      </div>

      <div className="ct-rise mt-10 flex items-center gap-3" style={{ animationDelay: '0.25s' }}>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: accent.dark }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              className="ct-tick"
              d="M4.5 12.5l5 5L19.5 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-2xl font-light" style={{ color: accent.dark }}>
          {t('confirmation.logged')}
        </p>
      </div>

      <p
        className="ct-rise mt-8 text-4xl font-light text-text-primary"
        style={{ fontSize: '2.5rem', animationDelay: '0.4s' }}
      >
        {timeStr}
      </p>
      <p className="ct-rise mt-1 text-base font-light text-text-secondary" style={{ animationDelay: '0.5s' }}>
        {dateStr}
      </p>

      {saveErrorMessage && (
        <p
          role="alert"
          className="mt-4 w-full max-w-sm rounded-card bg-blood-pressure-accent/15 px-4 py-3 text-center text-sm font-light text-blood-pressure-dark"
        >
          {saveErrorMessage}
        </p>
      )}

      {alertMessage && (
        <div className="mt-4 w-full max-w-sm">
          <AlertBanner message={alertMessage} />
        </div>
      )}

      <div
        className="mt-8 w-full max-w-sm"
        style={{ borderTop: `0.5px solid ${hexToRgba(accent.accent, 0.3)}` }}
      />

      <div className="mt-6 w-full max-w-sm">
        <input
          type="text"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={t('confirmation.add_note')}
          className="w-full rounded-full border border-divider bg-surface px-5 py-3.5 text-base outline-none placeholder:text-text-muted"
        />
      </div>

      <p className="mt-4 text-sm font-light text-text-muted">
        {t('confirmation.todays_count', { cardType: t(`card_types.${cardType}`), count: todayCount })}
      </p>

      {photoSlot && <div className="mt-6 w-full max-w-sm">{photoSlot}</div>}

      <button
        onClick={onBackHome}
        className="mt-10 w-full max-w-sm rounded-full py-4 text-base font-light text-white shadow-card"
        style={{ backgroundColor: accent.dark }}
      >
        {t('confirmation.back_home')}
      </button>

      {onUndo && (
        <button onClick={onUndo} className="mt-4 text-sm font-light text-text-muted underline">
          {t('confirmation.undo')}
        </button>
      )}
    </div>
  )
}
