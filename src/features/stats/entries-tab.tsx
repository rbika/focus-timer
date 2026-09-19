import { ChevronRight, Hourglass, Timer } from 'lucide-react'

import { groupEntriesByDay } from '@/features/stats/group-entries-by-day'
import { useEntries } from '@/features/stats/use-entries'
import type { Entry } from '@/lib/tauri'
import { secsToSummaryLabel } from '@/utils/time'

function formatUnixTime(unixSecs: number): string {
  const date = new Date(unixSecs * 1000)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function EntryCard({
  entry,
  onOpen,
}: {
  entry: Entry
  onOpen: (entry: Entry) => void
}) {
  const ModeIcon = entry.mode === 'timer' ? Hourglass : Timer

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="group flex min-w-0 items-center gap-2 rounded-[10px] bg-neutral-100/60 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-700/70"
    >
      <ModeIcon
        className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
        aria-label={entry.mode === 'timer' ? 'Timer' : 'Stopwatch'}
      />
      <span className="shrink-0 text-[13px] font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
        {secsToSummaryLabel(entry.durationSecs)}
      </span>
      <span className="ml-2 min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
        {formatUnixTime(entry.startedAtUnix)} –{' '}
        {formatUnixTime(entry.endedAtUnix)}
      </span>
      <ChevronRight
        className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-400 dark:text-neutral-600 dark:group-hover:text-neutral-100"
        aria-hidden
      />
    </button>
  )
}

export function EntriesTab({
  onOpenEntry,
}: {
  onOpenEntry: (entry: Entry) => void
}) {
  const entries = useEntries()

  if (entries != null && entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No entries yet
      </div>
    )
  }

  const sections = entries ? groupEntriesByDay(entries) : []

  return (
    <div className="-mx-4 flex flex-1 flex-col overflow-y-auto overscroll-none px-4">
      {sections.map((section) => (
        <section
          key={section.key}
          className="flex flex-col gap-2 pb-4 last:pb-0"
        >
          <header className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between gap-2 bg-[canvas] px-4 py-1.5">
            <h2 className="text-[13px] text-neutral-800 dark:text-neutral-100">
              {section.label}
            </h2>
            <span className="text-[13px] font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
              {secsToSummaryLabel(section.totalSecs)}
            </span>
          </header>
          {section.entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onOpen={onOpenEntry} />
          ))}
        </section>
      ))}
    </div>
  )
}
