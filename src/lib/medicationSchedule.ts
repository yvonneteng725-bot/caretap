import { supabase } from './supabase'

export async function getMedicationSchedule(elderId: string): Promise<string[]> {
  const { data } = await supabase
    .from('medication_schedules')
    .select('schedule_times')
    .eq('elder_id', elderId)
    .eq('active', true)
    .maybeSingle()

  return (data?.schedule_times as string[] | undefined) ?? []
}

export async function saveMedicationSchedule(elderId: string, times: string[]): Promise<void> {
  const { data: existing } = await supabase
    .from('medication_schedules')
    .select('id')
    .eq('elder_id', elderId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('medication_schedules')
      .update({ schedule_times: times, active: times.length > 0 })
      .eq('id', existing.id)
  } else {
    await supabase.from('medication_schedules').insert({
      elder_id: elderId,
      schedule_times: times,
      active: times.length > 0,
    })
  }
}
