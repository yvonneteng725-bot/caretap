import type { Log } from '../types'

type Translate = (key: string, options?: Record<string, unknown>) => string

// One-line summary of what was actually recorded, shown in the feed rows so
// historical readings (BP, temperature…) are visible at a glance.
export function formatLogValue(log: Log, t: Translate): string | null {
  if (log.card_type === 'blood_pressure') {
    if (log.bp_systolic == null && log.bp_diastolic == null) return null
    const parts = [`${log.bp_systolic ?? '—'}/${log.bp_diastolic ?? '—'} mmHg`]
    if (log.bp_pulse != null) parts.push(`${t('vitals.pulse')} ${log.bp_pulse}`)
    if (log.spo2 != null) parts.push(`SpO₂ ${log.spo2}%`)
    return parts.join(' · ')
  }
  if (log.card_type === 'body_temperature') {
    return log.temperature_c != null ? `${log.temperature_c}°C` : null
  }
  if (log.card_type === 'blood_sugar') {
    if (log.glucose_mmol == null) return null
    const timing = log.glucose_timing ? ` (${t(`vitals.${log.glucose_timing}`)})` : ''
    return `${log.glucose_mmol} mmol/L${timing}`
  }
  if (log.card_type === 'meal_log') {
    const parts: string[] = []
    if (log.meal_intake) parts.push(t(`meal_intake.${log.meal_intake}`))
    if (log.hydration_status) parts.push(`${t('hydration.label')}: ${t(`hydration.${log.hydration_status}`)}`)
    return parts.length ? parts.join(' · ') : null
  }
  return null
}
