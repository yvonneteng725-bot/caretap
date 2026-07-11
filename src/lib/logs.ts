import { enqueueLog, removeQueuedLog } from './offlineQueue'
import { insertLog } from './insertLog'
import { supabase } from './supabase'
import { checkAlert, sendAlert } from './alerts'
import type { CardType, Log } from '../types'

export type NewLogInput = Partial<
  Pick<
    Log,
    | 'note'
    | 'bp_systolic'
    | 'bp_diastolic'
    | 'bp_pulse'
    | 'spo2'
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
    spo2: input.spo2 ?? null,
    temperature_c: input.temperature_c ?? null,
    glucose_mmol: input.glucose_mmol ?? null,
    glucose_timing: input.glucose_timing ?? null,
    meal_intake: input.meal_intake ?? null,
    hydration_status: input.hydration_status ?? null,
    photo_url: input.photo_url ?? null,
    created_at: new Date().toISOString(),
  }
}

export type PersistResult =
  | { status: 'saved' }
  | { status: 'queued' }
  | { status: 'failed'; message: string }

function isNetworkError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')
}

export async function persistLog(log: Log): Promise<PersistResult> {
  const { id, ...rest } = log
  const payload = { id, ...rest }

  if (!navigator.onLine) {
    await enqueueLog({ ...payload, queueId: id })
    return { status: 'queued' }
  }

  const { error } = await insertLog(payload)
  if (error) {
    // Only connectivity problems belong in the offline queue — a permanent
    // rejection (RLS, bad data) would just fail again forever while the UI
    // pretends everything saved. Surface those instead.
    if (isNetworkError(error.message)) {
      await enqueueLog({ ...payload, queueId: id })
      return { status: 'queued' }
    }
    return { status: 'failed', message: error.message }
  }

  const alertKey = checkAlert(log)
  if (alertKey) sendAlert(log.elder_id, log.id, alertKey)
  return { status: 'saved' }
}

export async function deleteLog(logId: string): Promise<boolean> {
  // The entry may still be sitting in the offline queue rather than the DB.
  await removeQueuedLog(logId).catch(() => {})
  const { error } = await supabase.from('logs').delete().eq('id', logId)
  return !error
}

// The log row is inserted optimistically in the background, so an update
// (photo_url, note) can arrive before the insert has landed — a plain UPDATE
// would match zero rows and the field would be lost silently. Retry until
// the row exists. Returns true once the update actually hit a row.
export async function updateLogField(
  logId: string,
  fields: Partial<Log>,
  attempts = 5,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.from('logs').update(fields).eq('id', logId).select('id')
    if (!error && data && data.length > 0) return true
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

// excludeLogId lets the confirmation screen count "other logs today" and add
// its own optimistic entry on top, so the result is stable regardless of
// whether the background insert has landed yet.
export async function getTodayCount(
  elderId: string,
  cardType: CardType,
  excludeLogId?: string,
): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  let query = supabase
    .from('logs')
    .select('id', { count: 'exact', head: true })
    .eq('elder_id', elderId)
    .eq('card_type', cardType)
    .gte('logged_at', startOfDay.toISOString())

  if (excludeLogId) query = query.neq('id', excludeLogId)

  const { count } = await query
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
