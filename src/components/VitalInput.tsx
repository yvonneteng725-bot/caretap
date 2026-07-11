import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GlucoseTiming } from '../types'

type BPSave = { bp_systolic: number; bp_diastolic: number; bp_pulse: number | null; spo2: number | null }
type TempSave = { temperature_c: number }
type GlucoseSave = { glucose_mmol: number; glucose_timing: GlucoseTiming }

interface BPProps {
  variant: 'blood_pressure'
  onSave: (v: BPSave) => void
}
interface TempProps {
  variant: 'body_temperature'
  onSave: (v: TempSave) => void
}
interface GlucoseProps {
  variant: 'blood_sugar'
  onSave: (v: GlucoseSave) => void
}

type Props = BPProps | TempProps | GlucoseProps

const TIMINGS: GlucoseTiming[] = ['before_meal', 'after_meal', 'fasting']

export function VitalInput(props: Props) {
  const { t } = useTranslation()

  if (props.variant === 'blood_pressure') {
    return <BloodPressureInput onSave={props.onSave} />
  }
  if (props.variant === 'body_temperature') {
    return <TemperatureInput onSave={props.onSave} />
  }
  return <GlucoseInput onSave={props.onSave} t={t} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-surface px-6 py-8">{children}</div>
}

function BloodPressureInput({ onSave }: { onSave: (v: BPSave) => void }) {
  const { t } = useTranslation()
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [pulse, setPulse] = useState('')
  const [spo2, setSpo2] = useState('')

  const canSave = sys !== '' && dia !== ''

  return (
    <Shell>
      <p className="brand-label text-center text-xs">{t('brand')}</p>
      <div className="mt-10 flex flex-col gap-6">
        <label className="block">
          <span className="text-sm font-light text-text-secondary">{t('vitals.bp_sys')}</span>
          <input
            autoFocus
            inputMode="numeric"
            value={sys}
            onChange={(e) => setSys(e.target.value.replace(/\D/g, ''))}
            className="mt-2 w-full rounded-full border border-divider bg-bg px-5 py-4 text-3xl font-light outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-light text-text-secondary">{t('vitals.bp_dia')}</span>
          <input
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))}
            className="mt-2 w-full rounded-full border border-divider bg-bg px-5 py-4 text-3xl font-light outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-light text-text-secondary">
            {t('vitals.pulse')} ({t('common.optional')})
          </span>
          <input
            inputMode="numeric"
            value={pulse}
            onChange={(e) => setPulse(e.target.value.replace(/\D/g, ''))}
            className="mt-2 w-full rounded-full border border-divider bg-bg px-5 py-4 text-3xl font-light outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-light text-text-secondary">
            {t('vitals.spo2')} ({t('common.optional')})
          </span>
          <input
            inputMode="numeric"
            value={spo2}
            onChange={(e) => setSpo2(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="98"
            className="mt-2 w-full rounded-full border border-divider bg-bg px-5 py-4 text-3xl font-light outline-none"
          />
        </label>
      </div>

      <p className="mt-4 text-xs font-light text-text-muted">{t('vitals.normal_range')}</p>
      <p className="mt-1 text-xs font-light text-text-muted">{t('vitals.spo2_normal')}</p>

      <button
        disabled={!canSave}
        onClick={() =>
          onSave({
            bp_systolic: Number(sys),
            bp_diastolic: Number(dia),
            bp_pulse: pulse ? Number(pulse) : null,
            spo2: spo2 ? Number(spo2) : null,
          })
        }
        className="mt-8 rounded-full py-4 text-sm font-light text-white disabled:opacity-40"
        style={{ backgroundColor: '#B07B7B' }}
      >
        {t('common.save')}
      </button>
    </Shell>
  )
}

function TemperatureInput({ onSave }: { onSave: (v: TempSave) => void }) {
  const { t } = useTranslation()
  const [unit, setUnit] = useState<'C' | 'F'>('C')
  const [value, setValue] = useState('')

  const canSave = value !== '' && !Number.isNaN(Number(value))

  const handleSave = () => {
    const raw = Number(value)
    const celsius = unit === 'F' ? ((raw - 32) * 5) / 9 : raw
    onSave({ temperature_c: Math.round(celsius * 10) / 10 })
  }

  return (
    <Shell>
      <p className="brand-label text-center text-xs">{t('brand')}</p>
      <p className="mt-8 text-sm font-light text-text-secondary">{t('vitals.temp_label')}</p>
      <input
        autoFocus
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder={unit === 'C' ? '36.5' : '97.7'}
        className="mt-3 w-full rounded-full border border-divider bg-bg px-5 py-4 text-3xl font-light outline-none"
      />

      <div className="mt-4 flex gap-2">
        {(['C', 'F'] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`flex-1 rounded-full py-2.5 text-sm font-light ${
              unit === u ? 'bg-body-temperature-accent text-white' : 'bg-bg text-text-secondary'
            }`}
          >
            °{u}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-light text-text-muted">{t('vitals.temp_normal')}</p>

      <button
        disabled={!canSave}
        onClick={handleSave}
        className="mt-8 rounded-full py-4 text-sm font-light text-white disabled:opacity-40"
        style={{ backgroundColor: '#C4956A' }}
      >
        {t('common.save')}
      </button>
    </Shell>
  )
}

function GlucoseInput({
  onSave,
  t,
}: {
  onSave: (v: GlucoseSave) => void
  t: (key: string) => string
}) {
  const [timing, setTiming] = useState<GlucoseTiming | null>(null)
  const [unit, setUnit] = useState<'mmol' | 'mgdl'>('mmol')
  const [value, setValue] = useState('')

  const canSave = timing !== null && value !== '' && !Number.isNaN(Number(value))

  const handleSave = () => {
    if (!timing) return
    const raw = Number(value)
    const mmol = unit === 'mgdl' ? raw / 18.0182 : raw
    onSave({ glucose_mmol: Math.round(mmol * 100) / 100, glucose_timing: timing })
  }

  return (
    <Shell>
      <p className="brand-label text-center text-xs">{t('brand')}</p>
      <p className="mt-8 text-sm font-light text-text-secondary">{t('vitals.glucose_timing')}</p>
      <div className="mt-3 flex flex-col gap-2">
        {TIMINGS.map((timingOpt) => (
          <button
            key={timingOpt}
            onClick={() => setTiming(timingOpt)}
            className={`rounded-full py-3.5 text-sm font-light ${
              timing === timingOpt ? 'bg-blood-sugar-accent text-white' : 'bg-bg text-text-primary'
            }`}
          >
            {t(`vitals.${timingOpt}`)}
          </button>
        ))}
      </div>

      {timing && (
        <>
          <p className="mt-6 text-sm font-light text-text-secondary">{t('vitals.glucose_label')}</p>
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
            className="mt-2 w-full rounded-full border border-divider bg-bg px-5 py-4 text-3xl font-light outline-none"
          />
          <div className="mt-4 flex gap-2">
            {(['mmol', 'mgdl'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 rounded-full py-2.5 text-sm font-light ${
                  unit === u ? 'bg-blood-sugar-accent text-white' : 'bg-bg text-text-secondary'
                }`}
              >
                {u === 'mmol' ? 'mmol/L' : 'mg/dL'}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-xs font-light text-text-muted">{t('vitals.glucose_normal')}</p>

      <button
        disabled={!canSave}
        onClick={handleSave}
        className="mt-8 rounded-full py-4 text-sm font-light text-white disabled:opacity-40"
        style={{ backgroundColor: '#6B9B9E' }}
      >
        {t('common.save')}
      </button>
    </Shell>
  )
}
