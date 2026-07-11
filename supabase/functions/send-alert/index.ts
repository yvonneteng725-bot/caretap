// Supabase Edge Function: send-alert
//
// Invoked directly from the client the moment a log is saved that crosses a
// clinical threshold (high/low BP, abnormal temperature or glucose, or a
// refused meal). Looks up everyone with access to the elder and sends each
// of them a push notification in their own preferred language.
//
// Deploy: supabase functions deploy send-alert
// Secrets required: VAPID_PRIVATE_KEY, VAPID_EMAIL (mailto:...), plus the
// project's SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto-provided).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

interface AlertPayload {
  elderId: string
  logId: string
  alertKey: 'bp_high' | 'bp_low' | 'spo2_low' | 'temp_high' | 'temp_low' | 'glucose_high' | 'meal_refused'
}

const MESSAGES: Record<string, Record<AlertPayload['alertKey'], string>> = {
  en: {
    bp_high: 'Blood pressure is elevated',
    bp_low: 'Blood pressure is low',
    spo2_low: 'Blood oxygen is low',
    temp_high: 'Temperature is above normal',
    temp_low: 'Temperature is below normal',
    glucose_high: 'Glucose is elevated',
    meal_refused: '{{name}} refused their meal',
  },
  'zh-TW': {
    bp_high: '血壓偏高',
    bp_low: '血壓偏低',
    spo2_low: '血氧偏低',
    temp_high: '體溫偏高',
    temp_low: '體溫偏低',
    glucose_high: '血糖偏高',
    meal_refused: '{{name}} 拒絕進食',
  },
  id: {
    bp_high: 'Tekanan darah tinggi',
    bp_low: 'Tekanan darah rendah',
    spo2_low: 'Saturasi oksigen rendah',
    temp_high: 'Suhu di atas normal',
    temp_low: 'Suhu di bawah normal',
    glucose_high: 'Gula darah tinggi',
    meal_refused: '{{name}} menolak makan',
  },
}

Deno.serve(async (req) => {
  try {
    const { elderId, logId, alertKey }: AlertPayload = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    const { data: elder } = await supabase.from('elders').select('name').eq('id', elderId).single()

    const { data: access } = await supabase
      .from('elder_access')
      .select('user_id, profiles:user_id(preferred_language)')
      .eq('elder_id', elderId)

    const userIds = (access ?? []).map((row: any) => row.user_id)
    if (userIds.length === 0) return new Response('ok', { status: 200 })

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', userIds)

    const langByUser = new Map((access ?? []).map((row: any) => [row.user_id, row.profiles?.preferred_language ?? 'en']))

    await Promise.allSettled(
      (subs ?? []).map(async (row: any) => {
        const lang = langByUser.get(row.user_id) ?? 'en'
        const template = MESSAGES[lang]?.[alertKey] ?? MESSAGES.en[alertKey]
        const body = template.replace('{{name}}', elder?.name ?? '')

        return webpush.sendNotification(
          row.subscription,
          JSON.stringify({ title: 'CareTap', body, data: { logId, elderId } }),
        )
      }),
    )

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
