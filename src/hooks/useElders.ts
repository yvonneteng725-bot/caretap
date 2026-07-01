import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useElderStore } from '../store/elderStore'

export function useElders() {
  const user = useAuthStore((s) => s.user)
  const { elders, selectedElderId, loading, fetchElders, selectElder } = useElderStore()

  useEffect(() => {
    if (user) fetchElders(user.id)
  }, [user, fetchElders])

  const selectedElder = elders.find((e) => e.id === selectedElderId) ?? null

  return { elders, selectedElder, selectedElderId, loading, selectElder }
}
