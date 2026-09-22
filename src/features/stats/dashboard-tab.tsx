import { useLiveTotals } from '@/features/stats/use-live-totals'
import { cn } from '@/utils/cn'
import { secsToSummaryLabel } from '@/utils/time'

function formatTotal(seconds: number | undefined): string {
  if (seconds == null) return ''
  if (seconds === 0) return '–'
  return secsToSummaryLabel(seconds)
}

function StatTile({
  label,
  seconds,
  className,
  labelClassName,
  totalClassName,
}: {
  label: string
  seconds: number | undefined
  className?: string
  labelClassName?: string
  totalClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-1 rounded-[10px] bg-neutral-100/60 p-3 dark:bg-neutral-800/60',
        className,
      )}
    >
      <span
        className={cn(
          'text-sm text-neutral-500 dark:text-neutral-100',
          labelClassName,
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'flex min-h-7 items-center text-xl text-neutral-900 tabular-nums dark:text-neutral-50',
          totalClassName,
        )}
      >
        {formatTotal(seconds)}
      </span>
    </div>
  )
}

export function DashboardTab() {
  const totals = useLiveTotals()

  return (
    <div className="flex flex-col gap-2">
      <StatTile label="Today" seconds={totals?.today} />
      <StatTile label="This Week" seconds={totals?.thisWeek} />
      <StatTile label="This Month" seconds={totals?.thisMonth} />
    </div>
  )
}
