import { useState } from 'react'

import { DashboardTab } from '@/features/stats/dashboard-tab'
import { EntriesTab } from '@/features/stats/entries-tab'
import { StatsTabSwitch, type StatsTab } from '@/features/stats/stats-tab-switch'

export function StatsView() {
  const [tab, setTab] = useState<StatsTab>('dashboard')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-1 pb-4">
        <StatsTabSwitch tab={tab} onChange={setTab} />
        {tab === 'dashboard' ? <DashboardTab /> : <EntriesTab />}
      </main>
    </div>
  )
}
