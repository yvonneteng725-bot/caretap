import { useCallback, useEffect, useState } from 'react'
import type { CardType, Log } from '../types'
import { fetchLogs, getTodayCount } from '../lib/logs'
import { useRealtimeLogs } from './useRealtime'

export function useTodayCount(elderId: string | null, cardType: CardType, excludeLogId?: string) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!elderId) return
    getTodayCount(elderId, cardType, excludeLogId).then(setCount)
  }, [elderId, cardType, excludeLogId])

  return count
}

export function useLogFeed(elderId: string | null, days = 30, cardType?: CardType) {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!elderId) return
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - days)
    const data = await fetchLogs(elderId, since, cardType)
    setLogs(data)
    setLoading(false)
  }, [elderId, days, cardType])

  useEffect(() => {
    load()
  }, [load])

  useRealtimeLogs(elderId, (log) => {
    if (cardType && log.card_type !== cardType) return
    setLogs((prev) =>
      prev.some((l) => l.id === log.id)
        ? // Update in place (merge keeps client-side joins like logged_by_name)
          prev.map((l) => (l.id === log.id ? { ...l, ...log } : l))
        : [log, ...prev],
    )
  })

  // Apply an edit/delete to the in-memory list immediately, so the UI (e.g.
  // an alert badge on a corrected reading) reflects the change without
  // waiting on a refetch.
  const patchLocal = useCallback((logId: string, fields: Partial<Log>) => {
    setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, ...fields } : l)))
  }, [])

  const removeLocal = useCallback((logId: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId))
  }, [])

  return { logs, loading, reload: load, patchLocal, removeLocal }
}
