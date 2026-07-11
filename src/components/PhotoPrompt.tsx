import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Check, RotateCcw } from 'lucide-react'
import { compressPhoto } from '../lib/compressPhoto'
import { uploadPhoto } from '../lib/uploadPhoto'
import { updateLogField } from '../lib/logs'
import type { CardType } from '../types'

// PHOTO MONETISATION HOOK
// v2 (Wound Care): AI wound healing progression — compare photo series over time,
//   flag non-healing wounds, estimate healing stage
// v2 (Meal Log): AI nutrition analysis — identify food items, estimate calories/protein,
//   flag nutritional deficiencies, generate weekly dietary report
// For MVP: photo is stored as-is. No AI processing. Infrastructure is identical for v2.

interface Props {
  elderId: string
  logId: string
  cardType: Extract<CardType, 'wound_care' | 'meal_log'>
}

export function PhotoPrompt({ elderId, logId, cardType }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const upload = async (file: File) => {
    setStatus('uploading')
    setErrorDetail(null)
    setPreviewUrl(URL.createObjectURL(file))
    try {
      const compressed = await compressPhoto(file)
      const path = `${elderId}/${cardType}/${logId}.jpg`
      const publicUrl = await uploadPhoto('log-photos', path, compressed)
      const saved = await updateLogField(logId, { photo_url: publicUrl })
      if (!saved) throw new Error('Could not attach the photo to the log entry')
      setStatus('done')
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      {status === 'done' && previewUrl ? (
        <div className="flex items-center gap-3 rounded-full bg-surface px-4 py-2">
          <img src={previewUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          <Check size={16} className="text-medications-accent" strokeWidth={2} />
        </div>
      ) : status === 'error' ? (
        <div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-light text-text-secondary"
          >
            <RotateCcw size={16} strokeWidth={1.5} />
            {t('common.retry')}
          </button>
          <p role="alert" className="mt-2 text-center text-xs font-light text-blood-pressure-dark">
            {t('confirmation.photo_failed', { message: errorDetail ?? '' })}
          </p>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={status === 'uploading'}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-surface py-3 text-sm font-light text-text-secondary disabled:opacity-60"
        >
          <Camera size={16} strokeWidth={1.5} />
          {status === 'uploading' ? t('common.loading') : t('confirmation.add_photo')}
        </button>
      )}
    </div>
  )
}
