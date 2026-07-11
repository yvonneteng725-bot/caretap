// Supabase Edge Function: upload-photo
//
// Fallback upload path for log photos and avatars. Hosted Supabase projects
// don't always allow SQL migrations to create policies on storage.objects
// ("must be owner of table objects"), which leaves uploads failing with
// "new row violates row-level security policy". This function performs the
// same access checks the policies would (avatars: own folder only;
// log-photos: member of the elder's care circle) and then uploads with the
// service role, which bypasses storage RLS.
//
// Deploy: supabase functions deploy upload-photo
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// (all auto-provided).

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

const SAFE_PATH = /^[A-Za-z0-9-]+(\/[A-Za-z0-9._-]+)+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    const { bucket, path, contentType, base64 } = await req.json()

    if (bucket !== 'log-photos' && bucket !== 'avatars') {
      return json({ error: 'Unknown bucket' }, 400)
    }
    if (typeof path !== 'string' || !SAFE_PATH.test(path) || path.includes('..')) {
      return json({ error: 'Invalid path' }, 400)
    }
    if (typeof base64 !== 'string' || base64.length > 8_000_000) {
      return json({ error: 'Invalid or oversized payload' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const rootFolder = path.split('/')[0]
    if (bucket === 'avatars') {
      // Users may only write inside their own folder.
      if (rootFolder !== user.id) return json({ error: 'Forbidden' }, 403)
    } else {
      // log-photos/{elder_id}/... — caller must be in the elder's care circle.
      const { data: access } = await admin
        .from('elder_access')
        .select('id')
        .eq('elder_id', rootFolder)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!access) return json({ error: 'Forbidden' }, 403)
    }

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, bytes, {
      contentType: typeof contentType === 'string' ? contentType : 'image/jpeg',
      upsert: true,
    })
    if (uploadError) return json({ error: uploadError.message }, 500)

    const { data } = admin.storage.from(bucket).getPublicUrl(path)
    return json({ publicUrl: data.publicUrl })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
