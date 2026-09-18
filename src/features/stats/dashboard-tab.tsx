import { useTotals } from '@/features/stats/use-totals'
import { secsToSummaryLabel } from '@/utils/time'

function formatTotal(seconds: number | undefined): string {
  if (seconds == null) return ''
  if (seconds === 0) return '–'
  return secsToSummaryLabel(seconds)
}

function StatTile({
  label,
  seconds,
}: {
  label: string
  seconds: number | undefined
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] bg-neutral-100/60 px-3.5 py-2.5 dark:bg-neutral-800/60">
      <span className="text-[13px] text-neutral-800 dark:text-neutral-100">
        {label}
      </span>
      <span className="flex min-h-7 items-center text-sm font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
        {formatTotal(seconds)}
      </span>
    </div>
  )
}

export function DashboardTab() {
  const totals = useTotals()

  return (
    <div className="flex flex-col gap-2">
      <StatTile label="Today" seconds={totals?.today} />
      <StatTile label="This Week" seconds={totals?.thisWeek} />
      <StatTile label="This Month" seconds={totals?.thisMonth} />
    </div>
  )
}
