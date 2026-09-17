import { useState } from 'react'

import { DashboardTab } from '@/features/stats/dashboard-tab'
import { StatsTabSwitch, type StatsTab } from '@/features/stats/stats-tab-switch'

export function StatsView() {
  const [tab, setTab] = useState<StatsTab>('dashboard')

  return (
    <div className="flex h-full flex-col">
      <main className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
        <StatsTabSwitch tab={tab} onChange={setTab} />
        {tab === 'dashboard' ? (
          <DashboardTab />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            No entries yet
          </div>
        )}
      </main>
    </div>
  )
}
