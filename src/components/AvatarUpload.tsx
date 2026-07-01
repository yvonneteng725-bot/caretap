import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { compressPhoto } from '../lib/compressPhoto'
import { supabase } from '../lib/supabase'

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

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPreview(URL.createObjectURL(file))
    try {
      const compressed = await compressPhoto(file, 150)
      const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (error) throw error
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onUploaded(data.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  const src = preview ?? photoUrl

  return (
    <button
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="relative h-16 w-16 shrink-0 rounded-full disabled:opacity-60"
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
  )
}
