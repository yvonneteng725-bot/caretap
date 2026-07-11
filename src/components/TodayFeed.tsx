import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { CARD_ACCENTS } from '../types'
import type { GlucoseTiming, Log, MealIntake } from '../types'
import { CARD_ICONS } from './icons'
import { AlertPill } from './AlertBanner'
import { checkAlert } from '../lib/alerts'
import { deleteLog, updateLogField } from '../lib/logs'
import { formatLogValue } from '../lib/logValues'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

interface Props {
  logs: Log[]
  // History shows rows spanning many days, so include the date; the Today
  // tab only shows today and keeps just the time.
  showDate?: boolean
  // Called after an edit or delete so the owner can refetch.
  onChanged?: () => void
}

export function TodayFeed({ logs, showDate = false, onChanged }: Props) {
  const { t, i18n } = useTranslation()
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (logs.length === 0) {
    return <p className="px-6 py-10 text-center text-sm font-light text-text-muted">{t('history.no_data')}</p>
  }

  const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'numeric', day: 'numeric' })

  return (
    <div className="flex flex-col">
      {logs.map((log) => {
        const Icon = CARD_ICONS[log.card_type]
        const accent = CARD_ACCENTS[log.card_type]
        const when = new Date(log.logged_at)
        const timeLabel = showDate ? `${dateFmt.format(when)} ${timeFmt.format(when)}` : timeFmt.format(when)
        const alert = checkAlert(log)
        const value = formatLogValue(log, t)
        const expanded = expandedId === log.id

        return (
          <div key={log.id} style={{ borderBottom: '0.5px solid rgba(200,184,154,0.25)' }}>
            <button
              onClick={() => setExpandedId(expanded ? null : log.id)}
              className="flex w-full items-start gap-3 px-6 py-4 text-left"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                <div style={{ transform: 'scale(0.3)' }}>
                  <Icon color={accent.accent} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-light text-text-primary">{t(`card_types.${log.card_type}`)}</span>
                  <span className="text-xs font-light text-text-muted">{timeLabel}</span>
                  {log.logged_by_name && (
                    <span className="text-xs font-light text-text-muted">· {log.logged_by_name}</span>
                  )}
                  {alert && <AlertPill label={t('alerts.high_badge')} />}
                </div>
                {value && <p className="mt-1 text-xs font-light text-text-secondary">{value}</p>}
                {log.note && <p className="mt-1 text-xs font-light text-text-secondary">{log.note}</p>}
              </div>
              {log.photo_url && (
                <img src={log.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              )}
              <span className="mt-1 shrink-0 text-text-muted">
                {expanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
              </span>
            </button>

            {expanded && <LogDetail log={log} onChanged={onChanged} onClose={() => setExpandedId(null)} />}
          </div>
        )
      })}
    </div>
  )
}

const detailInput =
  'w-full rounded-full border border-divider bg-bg px-4 py-2 text-sm font-normal outline-none'

function LogDetail({ log, onChanged, onClose }: { log: Log; onChanged?: () => void; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'

  const [sys, setSys] = useState(log.bp_systolic?.toString() ?? '')
  const [dia, setDia] = useState(log.bp_diastolic?.toString() ?? '')
  const [pulse, setPulse] = useState(log.bp_pulse?.toString() ?? '')
  const [spo2, setSpo2] = useState(log.spo2?.toString() ?? '')
  const [temp, setTemp] = useState(log.temperature_c?.toString() ?? '')
  const [glucose, setGlucose] = useState(log.glucose_mmol?.toString() ?? '')
  const [timing, setTiming] = useState<GlucoseTiming | ''>(log.glucose_timing ?? '')
  const [meal, setMeal] = useState<MealIntake | ''>(log.meal_intake ?? '')
  const [note, setNote] = useState(log.note ?? '')

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(log.logged_at))

  const num = (v: string) => (v === '' ? null : Number(v))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const fields: Partial<Log> = { note: note.trim() || null }
    if (log.card_type === 'blood_pressure') {
      fields.bp_systolic = num(sys)
      fields.bp_diastolic = num(dia)
      fields.bp_pulse = num(pulse)
      fields.spo2 = num(spo2)
    }
    if (log.card_type === 'body_temperature') fields.temperature_c = num(temp)
    if (log.card_type === 'blood_sugar') {
      fields.glucose_mmol = num(glucose)
      if (timing) fields.glucose_timing = timing
    }
    if (log.card_type === 'meal_log' && meal) fields.meal_intake = meal

    const ok = await updateLogField(log.id, fields, 1)
    setSaving(false)
    if (!ok) {
      setError(t('feed.update_failed'))
      return
    }
    onChanged?.()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    const ok = await deleteLog(log.id)
    setSaving(false)
    if (!ok) {
      setError(t('feed.update_failed'))
      return
    }
    onChanged?.()
    onClose()
  }

  const numberField = (label: string, value: string, set: (v: string) => void, decimal = false) => (
    <label className="block flex-1">
      <span className="text-xs font-light text-text-muted">{label}</span>
      <input
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(e) => set(decimal ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value.replace(/\D/g, ''))}
        className={`mt-1 ${detailInput}`}
      />
    </label>
  )

  return (
    <div className="bg-bg/60 px-6 pb-5 pt-1">
      <p className="text-xs font-light text-text-muted">{fullDate}</p>

      {log.card_type === 'blood_pressure' && (
        <div className="mt-3 flex gap-2">
          {numberField(t('vitals.bp_sys'), sys, setSys)}
          {numberField(t('vitals.bp_dia'), dia, setDia)}
          {numberField(t('vitals.pulse'), pulse, setPulse)}
          {numberField('SpO₂', spo2, setSpo2)}
        </div>
      )}
      {log.card_type === 'body_temperature' && (
        <div className="mt-3 flex gap-2">{numberField(`${t('vitals.temp_label')} (°C)`, temp, setTemp, true)}</div>
      )}
      {log.card_type === 'blood_sugar' && (
        <div className="mt-3 flex items-end gap-2">
          {numberField(`${t('vitals.glucose_label')} (mmol/L)`, glucose, setGlucose, true)}
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value as GlucoseTiming)}
            className={`flex-1 ${detailInput}`}
          >
            {(['before_meal', 'after_meal', 'fasting'] as const).map((tOpt) => (
              <option key={tOpt} value={tOpt}>
                {t(`vitals.${tOpt}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      {log.card_type === 'meal_log' && (
        <div className="mt-3">
          <select
            value={meal}
            onChange={(e) => setMeal(e.target.value as MealIntake)}
            className={detailInput}
          >
            {(['finished', 'partial', 'refused', 'soft_only', 'hydration'] as const).map((m) => (
              <option key={m} value={m}>
                {t(`meal_intake.${m}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('confirmation.add_note')}
        className={`mt-2 ${detailInput}`}
      />

      {log.photo_url && <img src={log.photo_url} alt="" className="mt-3 max-h-48 rounded-card object-cover" />}

      {error && (
        <p role="alert" className="mt-2 text-xs font-light text-blood-pressure-dark">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-full bg-medications-accent py-2.5 text-sm font-light text-white disabled:opacity-60"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-light disabled:opacity-60 ${
            confirmDelete ? 'bg-blood-pressure-accent text-white' : 'bg-surface text-blood-pressure-dark'
          }`}
        >
          <Trash2 size={14} strokeWidth={1.5} />
          {confirmDelete ? t('feed.confirm_delete') : t('feed.delete')}
        </button>
      </div>
    </div>
  )
}
