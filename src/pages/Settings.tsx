import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Trash2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useElders } from '../hooks/useElders'
import { useElderStore } from '../store/elderStore'
import { supabase } from '../lib/supabase'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { AvatarUpload } from '../components/AvatarUpload'
import {
  createInvite,
  listFamilyMembers,
  removeFamilyMember,
  type FamilyMember,
} from '../lib/invites'
import { getMedicationSchedule, saveMedicationSchedule } from '../lib/medicationSchedule'
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push'

export default function Settings() {
  const { t } = useTranslation()
  const { user, profile, signOut, refreshProfile } = useAuthStore()
  const { selectedElder, selectedElderId } = useElders()
  const fetchElders = useElderStore((s) => s.fetchElders)
  const isAdmin = profile?.role === 'admin'

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  useEffect(() => setDisplayName(profile?.display_name ?? ''), [profile?.display_name])

  const saveDisplayName = async () => {
    if (!user) return
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id)
    refreshProfile()
  }

  // Elder details (admin only)
  const [elderName, setElderName] = useState('')
  const [elderDob, setElderDob] = useState('')
  useEffect(() => {
    setElderName(selectedElder?.name ?? '')
    setElderDob(selectedElder?.date_of_birth ?? '')
  }, [selectedElder])

  const saveElder = async () => {
    if (!selectedElderId) return
    await supabase.from('elders').update({ name: elderName, date_of_birth: elderDob || null }).eq('id', selectedElderId)
  }

  // Medication schedule (admin only)
  const [times, setTimes] = useState<string[]>(['', '', '', ''])
  useEffect(() => {
    if (!selectedElderId) return
    getMedicationSchedule(selectedElderId).then((existing) => {
      const padded = [...existing, '', '', '', ''].slice(0, 4)
      setTimes(padded)
    })
  }, [selectedElderId])

  const saveSchedule = async () => {
    if (!selectedElderId) return
    await saveMedicationSchedule(selectedElderId, times.filter(Boolean))
  }

  // Family members (admin only)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (selectedElderId) listFamilyMembers(selectedElderId).then(setMembers)
  }, [selectedElderId])

  const handleInvite = async () => {
    if (!selectedElderId) return
    const link = await createInvite(selectedElderId, 'family')
    setInviteLink(link)
  }

  const handleRemove = async (accessId: string) => {
    await removeFamilyMember(accessId)
    setMembers((prev) => prev.filter((m) => m.access_id !== accessId))
  }

  // Notifications
  const [pushEnabled, setPushEnabled] = useState(false)
  useEffect(() => {
    getPushSubscriptionStatus().then((sub) => setPushEnabled(!!sub))
  }, [])

  const togglePush = async () => {
    if (!user) return
    if (pushEnabled) {
      await unsubscribeFromPush(user.id)
      setPushEnabled(false)
    } else {
      const sub = await subscribeToPush(user.id)
      setPushEnabled(!!sub)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 pb-10 pt-8">
      <p className="brand-label px-2 text-xs">{t('brand')}</p>

      <section className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <h2 className="text-sm font-light text-text-secondary">{t('nav.settings')}</h2>
        <div className="mt-3 flex items-center gap-4">
          {user && (
            <AvatarUpload
              photoUrl={profile?.avatar_url ?? null}
              bucket="avatars"
              path={`${user.id}/avatar.jpg`}
              fallback={(displayName || '?').charAt(0)}
              onUploaded={async (url) => {
                await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
                refreshProfile()
              }}
            />
          )}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={saveDisplayName}
            className="flex-1 rounded-full border border-divider bg-bg px-4 py-2.5 text-sm outline-none"
          />
        </div>
        <p className="mt-2 text-xs font-light text-text-muted">{profile?.role}</p>

        <p className="mt-5 text-xs font-light text-text-secondary">{t('settings.language')}</p>
        <div className="mt-2">
          <LanguageSwitcher />
        </div>
      </section>

      {isAdmin && selectedElder && (
        <section className="mt-4 rounded-card bg-surface p-5 shadow-card">
          <h2 className="text-sm font-light text-text-secondary">{selectedElder.name}</h2>
          <div className="mt-3 flex items-center gap-4">
            {user && (
              <AvatarUpload
                photoUrl={selectedElder.photo_url}
                bucket="avatars"
                path={`${user.id}/elder-${selectedElder.id}.jpg`}
                fallback={selectedElder.name.charAt(0)}
                onUploaded={async (url) => {
                  await supabase.from('elders').update({ photo_url: url }).eq('id', selectedElder.id)
                  if (user) fetchElders(user.id)
                }}
              />
            )}
            <input
              value={elderName}
              onChange={(e) => setElderName(e.target.value)}
              onBlur={saveElder}
              className="flex-1 rounded-full border border-divider bg-bg px-4 py-2.5 text-sm outline-none"
            />
          </div>
          <input
            type="date"
            value={elderDob}
            onChange={(e) => setElderDob(e.target.value)}
            onBlur={saveElder}
            className="mt-2 w-full rounded-full border border-divider bg-bg px-4 py-2.5 text-sm outline-none"
          />

          <p className="mt-5 text-xs font-light text-text-secondary">{t('onboarding.step3_title')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {times.map((time, i) => (
              <input
                key={i}
                type="time"
                value={time}
                onChange={(e) => setTimes((prev) => prev.map((t2, idx) => (idx === i ? e.target.value : t2)))}
                onBlur={saveSchedule}
                className="rounded-full border border-divider bg-bg px-4 py-2 text-sm outline-none"
              />
            ))}
          </div>
        </section>
      )}

      {isAdmin && selectedElderId && (
        <section className="mt-4 rounded-card bg-surface p-5 shadow-card">
          <h2 className="text-sm font-light text-text-secondary">{t('settings.invite')}</h2>

          <div className="mt-3 flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.access_id} className="flex items-center justify-between rounded-full bg-bg px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-light text-text-primary">
                    {m.display_name ?? m.full_name ?? m.user_id.slice(0, 8)}
                  </span>
                  <span className="rounded-full bg-medications-accent/20 px-2 py-0.5 text-xs font-light text-medications-dark">
                    {m.role}
                  </span>
                </div>
                <button onClick={() => handleRemove(m.access_id)} className="text-text-muted">
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleInvite}
            className="mt-4 w-full rounded-full bg-medications-accent py-3 text-sm font-light text-white"
          >
            {t('settings.invite')}
          </button>

          {inviteLink && (
            <div className="mt-3">
              <p className="text-xs font-light text-text-secondary">{t('settings.invite_link')}</p>
              <div className="mt-1 flex items-center gap-2 rounded-full bg-bg px-4 py-2.5">
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
            </div>
          )}
        </section>
      )}

      <section className="mt-4 rounded-card bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-light text-text-primary">{t('settings.notifications')}</span>
          <button
            onClick={togglePush}
            className={`rounded-full px-4 py-2 text-xs font-light transition-colors ${
              pushEnabled ? 'bg-medications-accent text-white' : 'bg-bg text-text-secondary'
            }`}
          >
            {pushEnabled ? '✓' : '○'}
          </button>
        </div>
      </section>

      <button
        onClick={signOut}
        className="mt-6 w-full rounded-full bg-blood-pressure-accent py-3 text-sm font-light text-white"
      >
        {t('settings.sign_out')}
      </button>
    </div>
  )
}
