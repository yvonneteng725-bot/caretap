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
//          Optional: GEMINI_MODEL to pin a specific model.
//
// Quota notes: free-tier keys have small per-model request budgets, and
// some models have no free quota at all. We default to the cheapest lite
// model and fall through a list of alternatives whenever a model answers
// 429 (quota) or 404 (not available for this key). One photo = exactly one
// request to one model (no retries on success paths), with a tiny
// max_output_tokens, so usage stays minimal.

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

    const body = JSON.stringify({
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
      generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 64 },
    })

    // Cheapest first; skip to the next model when this key has no quota
    // for it (429) or doesn't offer it (404/403). Google retires models
    // fast (2.0-flash-lite was shut down 2026-06), so if every known name
    // fails we ask the API which flash/lite models THIS key can actually
    // call and try those instead of failing.
    const knownModels = [
      Deno.env.get('GEMINI_MODEL'),
      'gemini-3.1-flash-lite',
      'gemini-3-flash',
      'gemini-3-flash-preview',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
    ].filter((m, i, arr): m is string => !!m && arr.indexOf(m) === i)

    let result: Record<string, unknown> | null = null
    let lastError = ''
    let quotaHit = false
    const tried = new Set<string>()

    const tryModel = async (model: string): Promise<boolean> => {
      tried.add(model)
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
      )
      if (geminiRes.ok) {
        result = await geminiRes.json()
        return true
      }
      const detail = await geminiRes.text()
      lastError = `${model}: ${geminiRes.status} ${detail.slice(0, 150)}`
      if (geminiRes.status === 429) quotaHit = true
      // A non-quota, non-availability error won't improve with other models.
      if (![429, 404, 403].includes(geminiRes.status)) throw new Error(lastError)
      return false
    }

    for (const model of knownModels) {
      if (await tryModel(model)) break
    }

    if (!result) {
      // Discover what this key can actually use (names change over time).
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
      )
      if (listRes.ok) {
        const listing = (await listRes.json()) as {
          models?: { name?: string; supportedGenerationMethods?: string[] }[]
        }
        const discovered = (listing.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => (m.name ?? '').replace(/^models\//, ''))
          .filter((n) => /flash/i.test(n) && !/thinking|image|live|audio|tts|exp/i.test(n))
          // Prefer lite (cheapest / most generous free quota) first.
          .sort((a, b) => Number(/lite/i.test(b)) - Number(/lite/i.test(a)))
          .filter((n) => !tried.has(n))
          .slice(0, 4)
        for (const model of discovered) {
          if (await tryModel(model)) break
        }
      }
    }

    if (!result) {
      if (quotaHit) return json({ error: 'quota_exceeded', detail: lastError }, 429)
      return json({ error: `Gemini API error: ${lastError}` }, 502)
    }
    const candidates = (result as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates
    const text: string = candidates?.[0]?.content?.parts?.[0]?.text ?? ''
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
