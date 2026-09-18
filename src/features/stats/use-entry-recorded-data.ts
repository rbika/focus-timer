import { useEffect, useRef, useState } from 'react'

import { onEntriesChanged, onEntryRecorded } from '@/lib/tauri'

/** Fetches data via `fetcher` on mount and refetches it whenever Entries
 * change (recorded, edited, or deleted). Shared by the Dashboard and
 * Entries tabs. Returns the current data plus a stable `refetch` for
 * callers that need extra refetches (e.g. at local midnight). */
export function useEntryRecordedData<T>(fetcher: () => Promise<T>): {
  data: T | null
  refetch: () => void
} {
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

    const unlistenRecorded = onEntryRecorded(refetch)
    const unlistenChanged = onEntriesChanged(refetch)

    return () => {
      cancelledRef.current = true
      void unlistenRecorded.then((fn) => fn())
      void unlistenChanged.then((fn) => fn())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, refetch }
}
