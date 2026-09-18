import { useEffect } from 'react'

/** Calls `refetch` shortly after each local midnight, then reschedules.
 * Dashboard totals and Entries day labels both change at that boundary
 * even when no new Entry is recorded. */
export function useRefetchAtLocalMidnight(refetch: () => void) {
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
}
