import { api, type Entry } from '@/lib/tauri'
import { useEntryRecordedData } from '@/features/stats/use-entry-recorded-data'

/** Fetches all Entries (newest-first) and keeps them current when an Entry
 * is recorded elsewhere in the app (e.g. a tray-menu pause). */
export function useEntries() {
  const { data } = useEntryRecordedData<Entry[]>(api.getEntries)
  return data
}
