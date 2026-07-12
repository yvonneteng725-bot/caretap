import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Log } from '../types'

// Subscribes to realtime INSERTs and UPDATEs on the logs table for a given
// elder so family viewers see new entries — and corrections — without
// refreshing.
export function useRealtimeLogs(elderId: string | null, onUpsert: (log: Log) => void) {
  useEffect(() => {
    if (!elderId) return

    const filter = { schema: 'public', table: 'logs', filter: `elder_id=eq.${elderId}` }
    const channel = supabase
      .channel(`logs-${elderId}`)
      .on('postgres_changes', { event: 'INSERT', ...filter }, (payload) => onUpsert(payload.new as Log))
      .on('postgres_changes', { event: 'UPDATE', ...filter }, (payload) => onUpsert(payload.new as Log))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId])
}
