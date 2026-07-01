import { useTranslation } from 'react-i18next'
import type { HydrationStatus } from '../types'

const OPTIONS: HydrationStatus[] = ['good', 'low', 'refused']

interface Props {
  value: HydrationStatus | null
  onChange: (value: HydrationStatus) => void
}

export function HydrationToggle({ value, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div>
      <p className="text-sm font-light text-text-secondary">{t('hydration.label')}</p>
      <div className="mt-3 flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 rounded-full py-3 text-sm font-light transition-colors ${
              value === opt ? 'bg-meal-log-accent text-white' : 'bg-surface text-text-secondary'
            }`}
          >
            {t(`hydration.${opt}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
