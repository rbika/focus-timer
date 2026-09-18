import { Hourglass, Timer } from 'lucide-react'

import { groupEntriesByDay } from '@/features/stats/group-entries-by-day'
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
  const ModeIcon = entry.mode === 'timer' ? Hourglass : Timer

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[10px] bg-neutral-100/60 px-3.5 py-2.5 dark:bg-neutral-800/60">
      <ModeIcon
        className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
        aria-label={entry.mode === 'timer' ? 'Timer' : 'Stopwatch'}
      />
      <span className="shrink-0 text-[13px] font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
        {secsToTotalLabel(entry.durationSecs)}
      </span>
      <span className="min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
        {formatUnixTime(entry.startedAtUnix)} –{' '}
        {formatUnixTime(entry.endedAtUnix)}
      </span>
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

  const sections = entries ? groupEntriesByDay(entries) : []

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-none">
      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-2">
          <header className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="text-[13px] text-neutral-800 dark:text-neutral-100">
              {section.label}
            </h2>
            <span className="text-[13px] font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
              {secsToTotalLabel(section.totalSecs)}
            </span>
          </header>
          {section.entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>
      ))}
    </div>
  )
}
