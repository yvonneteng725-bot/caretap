import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Log } from '../types'

// Subscribes to realtime INSERTs on the logs table for a given elder so
// family viewers see new entries appear without refreshing.
export function useRealtimeLogs(elderId: string | null, onInsert: (log: Log) => void) {
  useEffect(() => {
    if (!elderId) return

    const channel = supabase
      .channel(`logs-${elderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs', filter: `elder_id=eq.${elderId}` },
        (payload) => onInsert(payload.new as Log),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId])
}
