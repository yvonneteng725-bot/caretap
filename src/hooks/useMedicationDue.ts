import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Log } from '../types'

const GRACE_MINUTES = 30

// Returns true when an active medication schedule has a time slot that has
// passed (plus grace period) today with no matching medications log after it.
export function useMedicationDue(elderId: string | null, medicationLogs: Log[]): boolean {
  const [due, setDue] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!elderId) {
        setDue(false)
        return
      }
      const { data } = await supabase
        .from('medication_schedules')
        .select('schedule_times, active')
        .eq('elder_id', elderId)
        .eq('active', true)
        .maybeSingle()

      if (cancelled || !data?.schedule_times?.length) {
        setDue(false)
        return
      }

      const now = new Date()
      const todayLogs = medicationLogs.filter((l) => {
        const d = new Date(l.logged_at)
        return d.toDateString() === now.toDateString()
      })

      const isDue = (data.schedule_times as string[]).some((timeStr) => {
        const [h, m] = timeStr.split(':').map(Number)
        const scheduled = new Date(now)
        scheduled.setHours(h, m, 0, 0)
        const graceDeadline = new Date(scheduled.getTime() + GRACE_MINUTES * 60 * 1000)
        if (now < graceDeadline) return false

        return !todayLogs.some((l) => new Date(l.logged_at) >= scheduled)
      })

      if (!cancelled) setDue(isDue)
    }

    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [elderId, medicationLogs])

  return due
}
