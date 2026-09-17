import { cn } from '@/utils/cn'

export type StatsTab = 'dashboard' | 'entries'

type Props = {
  tab: StatsTab
  onChange: (tab: StatsTab) => void
}

export function StatsTabSwitch({ tab, onChange }: Props) {
  const isDashboard = tab === 'dashboard'

  return (
    <div className="relative flex h-7 w-full shrink-0 items-center rounded-full bg-neutral-200/80 p-0.5 dark:bg-neutral-700/80">
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0.5 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-[left] duration-200 dark:bg-neutral-100',
          isDashboard ? 'left-[2px]' : 'left-[calc(50%+2px)]',
        )}
      />
      <button
        type="button"
        onClick={() => onChange('dashboard')}
        aria-pressed={isDashboard}
        className={cn(
          'relative z-10 flex-1 rounded-full py-1 text-xs font-medium transition-colors',
          isDashboard
            ? 'text-neutral-900 dark:text-neutral-800'
            : 'text-neutral-500 dark:text-neutral-400',
        )}
      >
        Dashboard
      </button>
      <button
        type="button"
        onClick={() => onChange('entries')}
        aria-pressed={!isDashboard}
        className={cn(
          'relative z-10 flex-1 rounded-full py-1 text-xs font-medium transition-colors',
          !isDashboard
            ? 'text-neutral-900 dark:text-neutral-800'
            : 'text-neutral-500 dark:text-neutral-400',
        )}
      >
        Entries
      </button>
    </div>
  )
}
