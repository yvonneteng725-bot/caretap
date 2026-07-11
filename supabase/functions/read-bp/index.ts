// Supabase Edge Function: read-bp
//
// Receives a photo of a blood pressure monitor display and uses the Google
// Gemini vision API to extract the readings, so caregivers can snap a photo
// instead of typing the numbers. The client always shows the extracted
// values for confirmation before saving — this function never writes logs.
//
// Deploy:  supabase functions deploy read-bp
// Secrets: GEMINI_API_KEY (from https://aistudio.google.com/apikey), plus
//          the auto-provided SUPABASE_URL / SUPABASE_ANON_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const PROMPT = `You are reading the display of a home blood pressure monitor (possibly also showing pulse and blood oxygen).
Extract the readings and answer with ONLY this JSON, using null for anything not visible:
{"systolic": <int|null>, "diastolic": <int|null>, "pulse": <int|null>, "spo2": <int|null>}
systolic is the larger upper value (SYS), diastolic the lower value (DIA), pulse the heart rate (PUL/HR), spo2 the blood-oxygen percentage if shown.
Sanity limits: systolic 60-260, diastolic 30-160, pulse 25-220, spo2 50-100. Use null for values outside these ranges or unreadable digits.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY is not configured for this project' }, 500)
    }

    // Any signed-in user may call this; it only performs OCR on the image.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    const { base64, contentType } = await req.json()
    if (typeof base64 !== 'string' || base64.length > 8_000_000) {
      return json({ error: 'Invalid or oversized image' }, 400)
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                {
                  inline_data: {
                    mime_type: typeof contentType === 'string' ? contentType : 'image/jpeg',
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    )

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      return json({ error: `Gemini API error (${geminiRes.status}): ${detail.slice(0, 200)}` }, 502)
    }

    const result = await geminiRes.json()
    const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'Could not read numbers from the photo' }, 422)
    }

    const clamp = (v: unknown, lo: number, hi: number): number | null => {
      const n = typeof v === 'number' ? Math.round(v) : null
      return n !== null && n >= lo && n <= hi ? n : null
    }

    return json({
      systolic: clamp(parsed.systolic, 60, 260),
      diastolic: clamp(parsed.diastolic, 30, 160),
      pulse: clamp(parsed.pulse, 25, 220),
      spo2: clamp(parsed.spo2, 50, 100),
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
