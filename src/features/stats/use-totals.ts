import { useEffect } from 'react'

import { api, type Totals } from '@/lib/tauri'
import { useEntryRecordedData } from '@/features/stats/use-entry-recorded-data'

/** Fetches Dashboard totals and keeps them current when an Entry is
 * recorded elsewhere in the app (e.g. a tray-menu pause). */
export function useTotals() {
  const { data: totals, refetch } = useEntryRecordedData<Totals>(api.getTotals)

  // Today/This-Week/This-Month buckets can change at local midnight even
  // without a new Entry (e.g. the Dashboard is left open overnight), so
  // reschedule a refetch for the next one each time this fires.
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null

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

    scheduleMidnightRefetch()

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer)
    }
  }, [refetch])

  return totals
}
