import { supabase } from './supabase'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Uploads to Supabase Storage and returns the public URL.
//
// Tries the direct client upload first (works when the storage RLS policies
// from 001_initial.sql exist). Hosted projects don't always let migrations
// create policies on storage.objects, in which case direct uploads fail with
// "new row violates row-level security policy" — so we fall back to the
// upload-photo Edge Function, which re-checks access and uploads with the
// service role.
export async function uploadPhoto(
  bucket: 'log-photos' | 'avatars',
  path: string,
  blob: Blob,
  contentType = 'image/jpeg',
): Promise<string> {
  const direct = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true })
  if (!direct.error) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const base64 = await blobToBase64(blob)
  const { data, error } = await supabase.functions.invoke('upload-photo', {
    body: { bucket, path, contentType, base64 },
  })
  if (error || !data?.publicUrl) {
    const fallbackMsg = error instanceof Error ? error.message : ((data as { error?: string })?.error ?? '')
    throw new Error(`${direct.error.message}${fallbackMsg ? ` (fallback: ${fallbackMsg})` : ''}`)
  }
  return data.publicUrl as string
}
