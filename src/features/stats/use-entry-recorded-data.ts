import { useEffect, useRef, useState } from 'react'

import { onEntryRecorded } from '@/lib/tauri'

/** Fetches data via `fetcher` on mount and refetches it whenever an Entry
 * is recorded elsewhere in the app (e.g. a tray-menu pause). Shared by the
 * Dashboard and Entries tabs, which both derive their view from Entries.
 * Returns the current data plus a stable `refetch` for callers that need
 * to trigger additional refetches of their own (e.g. at local midnight). */
export function useEntryRecordedData<T>(
  fetcher: () => Promise<T>,
): { data: T | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null)
  const cancelledRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useRef(() => {
    void fetcherRef.current().then((next) => {
      if (!cancelledRef.current) setData(next)
    })
  }).current

  useEffect(() => {
    cancelledRef.current = false
    refetch()

    const unlisten = onEntryRecorded(refetch)

    return () => {
      cancelledRef.current = true
      void unlisten.then((fn) => fn())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, refetch }
}
