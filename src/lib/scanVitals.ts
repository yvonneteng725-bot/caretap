import { supabase } from './supabase'
import { compressPhoto } from './compressPhoto'

export interface ScannedVitals {
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  spo2: number | null
}

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

// Sends a photo of a blood pressure monitor to the read-bp Edge Function
// (Gemini vision) and returns the extracted readings. The caller prefills
// the input fields with them — the user always confirms before saving.
export async function scanBloodPressurePhoto(file: File): Promise<ScannedVitals> {
  const compressed = await compressPhoto(file, 400)
  const base64 = await blobToBase64(compressed)

  const { data, error } = await supabase.functions.invoke('read-bp', {
    body: { base64, contentType: 'image/jpeg' },
  })
  if (error) {
    // Non-2xx responses surface as FunctionsHttpError; the useful message
    // is in the response body, not error.message.
    let message = error instanceof Error ? error.message : String(error)
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json()
        if (body?.error) message = String(body.error)
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message)
  }
  if (data?.error) {
    throw new Error(String(data.error))
  }
  return {
    systolic: data?.systolic ?? null,
    diastolic: data?.diastolic ?? null,
    pulse: data?.pulse ?? null,
    spo2: data?.spo2 ?? null,
  }
}
