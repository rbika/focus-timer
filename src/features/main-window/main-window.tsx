import { useState } from 'react'

import { WindowTitleBar } from '@/components/window-title-bar'
import { StatsView } from '@/features/stats/stats-view'
import { TimerView } from '@/features/timer/timer-view'
import { api } from '@/lib/tauri'
import type { MainView } from '@/lib/tauri'
import { cn } from '@/utils/cn'

export function MainWindow() {
  const [view, setView] = useState<MainView>('timer')

  const switchTo = (next: MainView) => {
    if (next === view) return
    setView(next)
    void api.resizeMainWindow(next)
  }

  return (
    <div className="flex h-full flex-col">
      <WindowTitleBar
        title=""
        onOpenSettings={() => void api.openSettings()}
        navigation={
          view === 'timer'
            ? { direction: 'stats', onClick: () => switchTo('stats') }
            : { direction: 'back', onClick: () => switchTo('timer') }
        }
      />
      <div className="relative flex-1">
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-200',
            view === 'timer' ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <TimerView />
        </div>
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-200',
            view === 'stats' ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <StatsView />
        </div>
      </div>
    </div>
  )
}
