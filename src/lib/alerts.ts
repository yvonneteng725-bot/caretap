import { supabase } from './supabase'
import type { Log } from '../types'

export type AlertKey = 'bp_high' | 'bp_low' | 'temp_high' | 'temp_low' | 'glucose_high' | 'meal_refused'

// Evaluates whether a saved log crosses a clinical threshold that should
// notify family immediately. Mirrors the same thresholds shown as reference
// ranges on each vital input screen.
export function checkAlert(log: Partial<Log>): AlertKey | null {
  if (log.card_type === 'blood_pressure') {
    const sys = log.bp_systolic ?? null
    const dia = log.bp_diastolic ?? null
    if (sys !== null && sys < 90) return 'bp_low'
    if ((sys !== null && sys > 140) || (dia !== null && dia > 90)) return 'bp_high'
  }
  if (log.card_type === 'body_temperature') {
    const temp = log.temperature_c ?? null
    if (temp !== null) {
      if (temp > 37.5) return 'temp_high'
      if (temp < 36.0) return 'temp_low'
    }
  }
  if (log.card_type === 'blood_sugar') {
    const glucose = log.glucose_mmol ?? null
    if (glucose !== null) {
      if (log.glucose_timing === 'fasting' && glucose > 7.0) return 'glucose_high'
      if (log.glucose_timing === 'after_meal' && glucose > 11.1) return 'glucose_high'
    }
  }
  if (log.card_type === 'meal_log' && log.meal_intake === 'refused') {
    return 'meal_refused'
  }
  return null
}

// Fires the send-alert Edge Function in the background. Never blocks or
// throws into the calling save flow — the log itself has already succeeded.
export function sendAlert(elderId: string, logId: string, alertKey: AlertKey): void {
  supabase.functions
    .invoke('send-alert', {
      body: { elderId, logId, alertKey },
    })
    .catch(() => {
      // best-effort; family will still see the alert badge in the feed
    })
}
