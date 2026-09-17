import { useTotals } from '@/features/stats/use-totals'
import { secsToTotalLabel } from '@/utils/time'

function StatTile({ label, seconds }: { label: string; seconds: number | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] bg-neutral-100/60 px-3.5 py-2.5 dark:bg-neutral-800/60">
      <span className="text-[13px] text-neutral-800 dark:text-neutral-100">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
        {seconds == null ? '—' : secsToTotalLabel(seconds)}
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
