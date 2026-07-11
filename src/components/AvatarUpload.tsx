import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { compressPhoto } from '../lib/compressPhoto'
import { uploadPhoto } from '../lib/uploadPhoto'

interface Props {
  photoUrl: string | null
  bucket: 'avatars' | 'log-photos'
  path: string
  onUploaded: (url: string) => void
  fallback: string
}

export function AvatarUpload({ photoUrl, bucket, path, onUploaded, fallback }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    setPreview(URL.createObjectURL(file))
    try {
      const compressed = await compressPhoto(file, 150)
      const publicUrl = await uploadPhoto(bucket, path, compressed)
      onUploaded(publicUrl)
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const src = preview ?? photoUrl

  return (
    <div className="shrink-0">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative h-16 w-16 rounded-full disabled:opacity-60"
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
        {src ? (
          <img src={src} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg text-lg font-light text-text-secondary">
            {fallback}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-medications-accent text-white">
          <Camera size={12} strokeWidth={2} />
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-[8rem] text-center text-[10px] font-light leading-tight text-blood-pressure-dark">
          {error}
        </p>
      )}
    </div>
  )
}
