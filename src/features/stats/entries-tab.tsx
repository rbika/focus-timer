import { useEffect, useRef, type RefObject } from 'react'

import { ChevronRight, Hourglass, SquarePen, Timer } from 'lucide-react'

import { groupEntriesByDay } from '@/features/stats/group-entries-by-day'
import { useEntries } from '@/features/stats/use-entries'
import type { Entry } from '@/lib/tauri'
import { secsToSummaryLabel } from '@/utils/time'

function useStickyHeaderFade(
  scrollerRef: RefObject<HTMLDivElement | null>,
  sectionCount: number,
) {
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || sectionCount === 0) return

    let frame = 0
    const update = () => {
      frame = 0
      const rootTop = scroller.getBoundingClientRect().top
      const headers =
        scroller.querySelectorAll<HTMLElement>('[data-day-header]')
      for (const header of headers) {
        const pushed = rootTop - header.getBoundingClientRect().top
        const opacity =
          pushed <= 0.5 ? 1 : 1 - Math.min(1, pushed / header.offsetHeight)
        header.style.opacity = String(opacity)
      }
    }

    const onScroll = () => {
      if (frame !== 0) return
      frame = requestAnimationFrame(update)
    }

    update()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [scrollerRef, sectionCount])
}

function formatUnixTime(unixSecs: number): string {
  const date = new Date(unixSecs * 1000)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function typeIcon(mode: Entry['mode']) {
  if (mode === 'timer') return Hourglass
  if (mode === 'stopwatch') return Timer
  return SquarePen
}

function typeLabel(mode: Entry['mode']) {
  if (mode === 'timer') return 'Timer'
  if (mode === 'stopwatch') return 'Stopwatch'
  return 'Manual'
}

function EntryCard({
  entry,
  onOpen,
}: {
  entry: Entry
  onOpen: (entry: Entry) => void
}) {
  const TypeIcon = typeIcon(entry.mode)

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="group flex min-w-0 items-center gap-2 rounded-[10px] bg-neutral-100/60 px-3.5 py-2.5 text-left transition-colors last:mb-4 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
    >
      <TypeIcon
        className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-400"
        aria-label={typeLabel(entry.mode)}
      />
      <span className="shrink-0 text-[13px] font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
        {secsToSummaryLabel(entry.durationSecs)}
      </span>
      <span className="ml-2 min-w-0 truncate text-xs text-neutral-400 dark:text-neutral-400">
        {formatUnixTime(entry.startedAtUnix)} –{' '}
        {formatUnixTime(entry.endedAtUnix)}
      </span>
      <ChevronRight
        className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-400 dark:text-neutral-600 dark:group-hover:text-neutral-500"
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
  const scrollerRef = useRef<HTMLDivElement>(null)
  const sections = entries ? groupEntriesByDay(entries) : []
  useStickyHeaderFade(scrollerRef, sections.length)

  if (entries != null && entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
        No entries yet
      </div>
    )
  }

  return (
    <div
      ref={scrollerRef}
      className="-mx-4 flex flex-1 flex-col overflow-y-auto overscroll-none px-4"
    >
      {sections.map((section, index) => (
        <section key={section.key} className="flex flex-col gap-2 last:pb-0">
          <header
            data-day-header
            className="sticky top-0 -mx-4 flex items-baseline justify-between gap-2 bg-[canvas] px-4 py-1.5"
            style={{ zIndex: sections.length - index }}
          >
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
