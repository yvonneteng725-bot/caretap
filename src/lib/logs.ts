import { supabase } from './supabase'
import { enqueueLog } from './offlineQueue'
import { checkAlert, sendAlert } from './alerts'
import type { CardType, Log } from '../types'

export type NewLogInput = Partial<
  Pick<
    Log,
    | 'note'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'bp_pulse'
    | 'temperature_c'
    | 'glucose_mmol'
    | 'glucose_timing'
    | 'meal_intake'
    | 'hydration_status'
    | 'photo_url'
  >
>

// Builds the optimistic log object shown instantly on the Confirmation
// Screen, then fires the Supabase insert (or offline queue) in the
// background. The caller never awaits the write before rendering.
export function createOptimisticLog(
  elderId: string,
  loggedBy: string,
  cardType: CardType,
  input: NewLogInput = {},
): Log {
  return {
    id: crypto.randomUUID(),
    elder_id: elderId,
    logged_by: loggedBy,
    card_type: cardType,
    logged_at: new Date().toISOString(),
    note: input.note ?? null,
    bp_systolic: input.bp_systolic ?? null,
    bp_diastolic: input.bp_diastolic ?? null,
    bp_pulse: input.bp_pulse ?? null,
    temperature_c: input.temperature_c ?? null,
    glucose_mmol: input.glucose_mmol ?? null,
    glucose_timing: input.glucose_timing ?? null,
    meal_intake: input.meal_intake ?? null,
    hydration_status: input.hydration_status ?? null,
    photo_url: input.photo_url ?? null,
    created_at: new Date().toISOString(),
  }
}

export async function persistLog(log: Log): Promise<void> {
  const { id, ...rest } = log
  const payload = { id, ...rest }

  if (!navigator.onLine) {
    await enqueueLog({ ...payload, queueId: id })
    return
  }

  const { error } = await supabase.from('logs').insert(payload)
  if (error) {
    await enqueueLog({ ...payload, queueId: id })
    return
  }

  const alertKey = checkAlert(log)
  if (alertKey) sendAlert(log.elder_id, log.id, alertKey)
}

export async function updateLogField(logId: string, fields: Partial<Log>): Promise<void> {
  await supabase.from('logs').update(fields).eq('id', logId)
}

export async function getTodayCount(elderId: string, cardType: CardType): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('logs')
    .select('id', { count: 'exact', head: true })
    .eq('elder_id', elderId)
    .eq('card_type', cardType)
    .gte('logged_at', startOfDay.toISOString())

  return count ?? 0
}

export async function fetchLogs(elderId: string, since: Date, cardType?: CardType): Promise<Log[]> {
  let query = supabase
    .from('logs')
    .select('*, profiles:logged_by(display_name, full_name)')
    .eq('elder_id', elderId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false })

  if (cardType) query = query.eq('card_type', cardType)

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row: any) => ({
    ...row,
    logged_by_name: row.profiles?.display_name ?? row.profiles?.full_name ?? null,
  })) as Log[]
}
