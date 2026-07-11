import { supabase } from './supabase'

// The client can be deployed before a migration adds a new logs column
// (e.g. spo2). PostgREST then rejects the whole insert with PGRST204
// "Could not find the '<col>' column of 'logs' in the schema cache".
// Rather than losing the entry, drop the unknown column and retry — the
// core reading still gets saved.
export async function insertLog(
  payload: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  const attempt = { ...payload }
  for (let i = 0; i < 4; i++) {
    const { error } = await supabase.from('logs').insert(attempt)
    if (!error) return { error: null }
    const missing = /Could not find the '(\w+)' column/.exec(error.message)?.[1]
    if (!missing || !(missing in attempt)) return { error }
    delete attempt[missing]
  }
  return { error: { message: 'Insert failed after retries' } }
}
