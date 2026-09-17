import { useState } from 'react'

import { StatsTabSwitch, type StatsTab } from '@/features/stats/stats-tab-switch'

export function StatsView() {
  const [tab, setTab] = useState<StatsTab>('dashboard')

  return (
    <div className="flex h-full flex-col">
      <main className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
        <StatsTabSwitch tab={tab} onChange={setTab} />
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          {tab === 'dashboard' ? 'Dashboard coming soon' : 'No entries yet'}
        </div>
      </main>
    </div>
  )
}
