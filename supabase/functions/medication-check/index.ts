// Supabase Edge Function: medication-check
//
// Runs on a cron schedule every 30 minutes. For every active medication
// schedule, checks whether a 'medications' log exists within the grace
// period after each scheduled time today. If a dose was missed, notifies
// everyone with access to that elder, once, in their own language.
//
// Deploy: supabase functions deploy medication-check
// Schedule (Supabase dashboard > Edge Functions > Cron):
//   */30 * * * *   ->  https://<project>.functions.supabase.co/medication-check

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const GRACE_MINUTES = 30
// The cron itself runs every 30 minutes, so a missed-dose check only fires
// once per dose: exactly in the 30-minute window right after grace expires.
const FIRE_WINDOW_MINUTES = 30

const MEDICATION_DUE: Record<string, string> = {
  en: 'Medications may be due',
  'zh-TW': '用藥時間可能到了',
  id: 'Waktunya minum obat',
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  webpush.setVapidDetails(
    Deno.env.get('VAPID_EMAIL')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const { data: schedules } = await supabase
    .from('medication_schedules')
    .select('elder_id, schedule_times, active')
    .eq('active', true)

  for (const schedule of schedules ?? []) {
    const times: string[] = schedule.schedule_times ?? []

    for (const timeStr of times) {
      const [h, m] = timeStr.split(':').map(Number)
      const scheduled = new Date(todayStart)
      scheduled.setHours(h, m, 0, 0)

      const graceDeadline = new Date(scheduled.getTime() + GRACE_MINUTES * 60 * 1000)
      const fireWindowEnd = new Date(graceDeadline.getTime() + FIRE_WINDOW_MINUTES * 60 * 1000)
      if (now < graceDeadline || now >= fireWindowEnd) continue

      const { data: logs } = await supabase
        .from('logs')
        .select('id')
        .eq('elder_id', schedule.elder_id)
        .eq('card_type', 'medications')
        .gte('logged_at', scheduled.toISOString())
        .limit(1)

      if (logs && logs.length > 0) continue

      const { data: access } = await supabase
        .from('elder_access')
        .select('user_id, profiles:user_id(preferred_language)')
        .eq('elder_id', schedule.elder_id)

      const userIds = (access ?? []).map((row: any) => row.user_id)
      if (userIds.length === 0) continue

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', userIds)

      const langByUser = new Map((access ?? []).map((row: any) => [row.user_id, row.profiles?.preferred_language ?? 'en']))

      await Promise.allSettled(
        (subs ?? []).map((row: any) => {
          const lang = langByUser.get(row.user_id) ?? 'en'
          const body = MEDICATION_DUE[lang] ?? MEDICATION_DUE.en
          return webpush.sendNotification(
            row.subscription,
            JSON.stringify({ title: 'CareTap', body, data: { elderId: schedule.elder_id } }),
          )
        }),
      )
    }
  }

  return new Response('ok', { status: 200 })
})
