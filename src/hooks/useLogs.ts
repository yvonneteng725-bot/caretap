import { useCallback, useEffect, useState } from 'react'
import type { CardType, Log } from '../types'
import { fetchLogs, getTodayCount } from '../lib/logs'
import { useRealtimeLogs } from './useRealtime'

export function useTodayCount(elderId: string | null, cardType: CardType) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!elderId) return
    getTodayCount(elderId, cardType).then(setCount)
  }, [elderId, cardType])

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
    setLogs((prev) => [log, ...prev.filter((l) => l.id !== log.id)])
  })

  return { logs, loading, reload: load }
}
