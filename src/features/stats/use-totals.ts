import { useEffect, useState } from 'react'

import { api, onEntryRecorded, type Totals } from '@/lib/tauri'

/** Fetches Dashboard totals and keeps them current when an Entry is
 * recorded elsewhere in the app (e.g. a tray-menu pause). */
export function useTotals() {
  const [totals, setTotals] = useState<Totals | null>(null)

  useEffect(() => {
    let cancelled = false
    let midnightTimer: ReturnType<typeof setTimeout> | null = null

    const refetch = () => {
      void api.getTotals().then((next) => {
        if (!cancelled) setTotals(next)
      })
    }

    // Today/This-Week/This-Month buckets can change at local midnight even
    // without a new Entry (e.g. the Dashboard is left open overnight), so
    // reschedule a refetch for the next one each time this fires.
    const scheduleMidnightRefetch = () => {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        5,
      )
      midnightTimer = setTimeout(() => {
        refetch()
        scheduleMidnightRefetch()
      }, nextMidnight.getTime() - now.getTime())
    }

    refetch()
    scheduleMidnightRefetch()

    const unlisten = onEntryRecorded(refetch)

    return () => {
      cancelled = true
      if (midnightTimer) clearTimeout(midnightTimer)
      void unlisten.then((fn) => fn())
    }
  }, [])

  return totals
}
