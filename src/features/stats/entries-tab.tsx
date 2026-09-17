import { useEntries } from '@/features/stats/use-entries'
import type { Entry } from '@/lib/tauri'
import { secsToTotalLabel } from '@/utils/time'

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

function formatUnixTime(unixSecs: number): string {
  return timeFormatter.format(new Date(unixSecs * 1000))
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] bg-neutral-100/60 px-3.5 py-2.5 dark:bg-neutral-800/60">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
          {secsToTotalLabel(entry.durationSecs)}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {entry.mode === 'timer' ? 'Timer' : 'Stopwatch'} ·{' '}
          {formatUnixTime(entry.startedAtUnix)} – {formatUnixTime(entry.endedAtUnix)}
        </span>
      </div>
    </div>
  )
}

export function EntriesTab() {
  const entries = useEntries()

  if (entries != null && entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No entries yet
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-none">
      {entries?.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
    </div>
  )
}
