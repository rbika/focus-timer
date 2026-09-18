import { useEntryRecordedData } from '@/features/stats/use-entry-recorded-data'
import { useRefetchAtLocalMidnight } from '@/features/stats/use-refetch-at-local-midnight'
import { api, type Entry } from '@/lib/tauri'

/** Fetches all Entries (newest-first) and keeps them current when an Entry
 * is recorded elsewhere in the app (e.g. a tray-menu pause). Also refetches
 * at local midnight so Today/Yesterday section labels stay correct. */
export function useEntries() {
  const { data, refetch } = useEntryRecordedData<Entry[]>(api.getEntries)
  useRefetchAtLocalMidnight(refetch)
  return data
}
