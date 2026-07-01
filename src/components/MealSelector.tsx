import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { HydrationStatus, MealIntake } from '../types'
import { HydrationToggle } from './HydrationToggle'

const INTAKE_OPTIONS: { value: MealIntake; emoji: string }[] = [
  { value: 'finished', emoji: '✅' },
  { value: 'partial', emoji: '🟡' },
  { value: 'refused', emoji: '❌' },
  { value: 'soft_only', emoji: '🥣' },
  { value: 'hydration', emoji: '💧' },
]

interface Props {
  onSave: (intake: MealIntake, hydration: HydrationStatus) => void
}

export function MealSelector({ onSave }: Props) {
  const { t } = useTranslation()
  const [intake, setIntake] = useState<MealIntake | null>(null)
  const [hydration, setHydration] = useState<HydrationStatus | null>(null)

  const canSave = intake !== null && hydration !== null

  return (
    <div className="flex min-h-screen flex-col bg-surface px-6 py-8">
      <p className="brand-label text-center text-xs">{t('brand')}</p>
      <h1 className="mt-8 text-lg font-light text-text-primary">{t('meal_intake.label')}</h1>

      <div className="mt-6 flex flex-col gap-3">
        {INTAKE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setIntake(opt.value)
              if (opt.value === 'hydration') setHydration('good')
            }}
            className={`rounded-full py-4 text-left text-sm font-light transition-colors ${
              intake === opt.value ? 'bg-meal-log-accent text-white' : 'bg-bg text-text-primary'
            } px-6`}
          >
            {opt.emoji} {t(`meal_intake.${opt.value}`)}
          </button>
        ))}
      </div>

      <div className="hairline mt-6" />

      <div className="mt-6">
        <HydrationToggle value={hydration} onChange={setHydration} />
      </div>

      <button
        disabled={!canSave}
        onClick={() => canSave && onSave(intake, hydration)}
        className="mt-8 rounded-full bg-meal-log-dark py-4 text-sm font-light text-white disabled:opacity-40"
      >
        {t('common.save')}
      </button>
    </div>
  )
}
