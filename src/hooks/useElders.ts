import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useElderStore } from '../store/elderStore'

export function useElders() {
  const user = useAuthStore((s) => s.user)
  const { elders, selectedElderId, loading, fetchedFor, fetchElders, selectElder } = useElderStore()

  useEffect(() => {
    if (user && !loading && fetchedFor !== user.id) fetchElders(user.id)
  }, [user, loading, fetchedFor, fetchElders])

  const selectedElder = elders.find((e) => e.id === selectedElderId) ?? null
  const fetched = user ? fetchedFor === user.id : false

  return { elders, selectedElder, selectedElderId, loading, fetched, selectElder }
}
