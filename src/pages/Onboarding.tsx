import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useElderStore } from '../store/elderStore'
import { supabase } from '../lib/supabase'
import { saveMedicationSchedule } from '../lib/medicationSchedule'
import { createInvite } from '../lib/invites'
import { compressPhoto } from '../lib/compressPhoto'
import { uploadPhoto } from '../lib/uploadPhoto'
import { Camera } from 'lucide-react'

const STEPS = 4

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const fetchElders = useElderStore((s) => s.fetchElders)
  const selectElder = useElderStore((s) => s.selectElder)

  const [step, setStep] = useState(1)
  const [elderId, setElderId] = useState<string | null>(null)

  // Step 1
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Step 2
  const [role, setRole] = useState<'caregiver' | 'family'>('caregiver')

  // Step 3
  const [times, setTimes] = useState<string[]>(['08:00', '13:00', '20:00', ''])

  // Step 4
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const finish = async () => {
    if (user) await fetchElders(user.id)
    navigate('/today', { replace: true })
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep1Error(null)

    if (!user) {
      setStep1Error(t('onboarding.error_signed_out'))
      return
    }
    if (!name.trim()) {
      setStep1Error(t('onboarding.error_name_required'))
      return
    }

    setSaving(true)
    try {
      // Generate the id client-side instead of `insert().select()`: Postgres
      // checks the RETURNING row against the elders SELECT policy, which
      // depends on an elder_access row that doesn't exist yet at this point,
      // so the returning variant fails RLS.
      const newElderId = crypto.randomUUID()
      const { error: elderError } = await supabase
        .from('elders')
        .insert({ id: newElderId, name: name.trim(), date_of_birth: dob || null, created_by: user.id })
      if (elderError) throw elderError

      const { error: accessError } = await supabase
        .from('elder_access')
        .insert({ elder_id: newElderId, user_id: user.id, role: 'admin' })
      if (accessError) throw accessError

      if (photoFile) {
        try {
          const compressed = await compressPhoto(photoFile, 150)
          const path = `${user.id}/elder-${newElderId}.jpg`
          const publicUrl = await uploadPhoto('avatars', path, compressed)
          await supabase.from('elders').update({ photo_url: publicUrl }).eq('id', newElderId)
        } catch {
          // The photo is optional — a failed upload shouldn't block onboarding.
        }
      }

      setElderId(newElderId)
      selectElder(newElderId)
      setStep(2)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ((err as { message?: string })?.message ?? String(err))
      setStep1Error(t('onboarding.error_save_failed', { message }))
    } finally {
      setSaving(false)
    }
  }

  const handleStep2 = async () => {
    if (user) {
      await supabase.from('profiles').update({ role }).eq('id', user.id)
    }
    setStep(3)
  }

  const handleStep3Save = async () => {
    if (elderId) await saveMedicationSchedule(elderId, times.filter(Boolean))
    setStep(4)
  }

  const handleInvite = async () => {
    if (!elderId) return
    setInviteError(null)
    try {
      const link = await createInvite(elderId, 'family')
      setInviteLink(link)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setInviteError(t('settings.invite_failed', { message }))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i + 1 <= step ? 'bg-medications-accent' : 'bg-divider'}`}
            />
          ))}
        </div>
        {step > 1 && (
          <button onClick={() => (step === STEPS ? finish() : setStep(step + 1))} className="text-xs font-light text-text-muted">
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="mt-10 flex flex-1 flex-col">
          <h1 className="text-lg font-light text-text-primary">{t('onboarding.step1_title')}</h1>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mt-6 rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
          />
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-3 rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
          />

          <label className="mt-3 flex items-center gap-2 self-start rounded-full bg-bg px-4 py-2.5 text-xs font-light text-text-secondary">
            <Camera size={14} strokeWidth={1.5} />
            {t('common.optional')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setPhotoFile(file)
                if (file) setPhotoPreview(URL.createObjectURL(file))
              }}
            />
          </label>
          {photoPreview && <img src={photoPreview} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" />}

          {step1Error && (
            <p role="alert" className="mt-4 text-xs font-light text-blood-pressure-dark">
              {step1Error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-auto rounded-full bg-medications-accent py-3 text-sm font-light text-white disabled:opacity-60"
          >
            {saving ? t('common.loading') : t('common.next')}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="text-lg font-light text-text-primary">{t('onboarding.step2_title')}</h1>
          <div className="mt-6 flex flex-col gap-3">
            {(['caregiver', 'family'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-full px-6 py-4 text-left text-sm font-light ${
                  role === r ? 'bg-medications-accent text-white' : 'bg-bg text-text-primary'
                }`}
              >
                {t(`onboarding.role_${r}`)}
              </button>
            ))}
          </div>
          <button onClick={handleStep2} className="mt-auto rounded-full bg-medications-accent py-3 text-sm font-light text-white">
            {t('common.next')}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="text-lg font-light text-text-primary">{t('onboarding.step3_title')}</h1>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {times.map((time, i) => (
              <input
                key={i}
                type="time"
                value={time}
                onChange={(e) => setTimes((prev) => prev.map((t2, idx) => (idx === i ? e.target.value : t2)))}
                className="rounded-full border border-divider bg-bg px-4 py-2.5 text-sm outline-none"
              />
            ))}
          </div>
          <button onClick={handleStep3Save} className="mt-auto rounded-full bg-medications-accent py-3 text-sm font-light text-white">
            {t('common.next')}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="text-lg font-light text-text-primary">{t('onboarding.step4_title')}</h1>

          {inviteLink ? (
            <>
              <div className="mt-6 flex items-center gap-2 rounded-full bg-bg px-4 py-3">
                <span className="flex-1 truncate text-xs font-light text-text-primary">{inviteLink}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check size={15} className="text-medications-accent" /> : (
                    <span className="text-xs font-light text-text-secondary">{t('common.copy')}</span>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs font-light text-text-muted">{t('settings.invite_hint')}</p>
            </>
          ) : (
            <button
              onClick={handleInvite}
              className="mt-6 rounded-full bg-medications-accent py-3 text-sm font-light text-white"
            >
              {t('settings.invite')}
            </button>
          )}

          {inviteError && (
            <p role="alert" className="mt-3 text-xs font-light text-blood-pressure-dark">
              {inviteError}
            </p>
          )}

          <button onClick={finish} className="mt-auto rounded-full bg-medications-dark py-3 text-sm font-light text-white">
            {t('common.done')}
          </button>
        </div>
      )}
    </div>
  )
}
