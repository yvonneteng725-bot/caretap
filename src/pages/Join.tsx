import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useElderStore } from '../store/elderStore'
import { redeemInvite } from '../lib/invites'

export default function Join() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const { session, user, initialized } = useAuthStore()
  const fetchElders = useElderStore((s) => s.fetchElders)
  const selectElder = useElderStore((s) => s.selectElder)

  const [status, setStatus] = useState<'redeeming' | 'done' | 'error'>('redeeming')

  useEffect(() => {
    if (!initialized || !session || !user || !token) return

    redeemInvite(token)
      .then(async (result) => {
        await fetchElders(user.id)
        if (result?.elder_id) selectElder(result.elder_id)
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [initialized, session, user, token, fetchElders, selectElder])

  if (!initialized) return null

  if (!session) {
    const redirect = encodeURIComponent(`/join/${token}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (status === 'done') return <Navigate to="/today" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <p className="text-sm font-light text-text-secondary">
        {status === 'error' ? 'This invite link is invalid or has expired.' : t('common.loading')}
      </p>
    </div>
  )
}
