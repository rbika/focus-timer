import { useCallback, useEffect, useState } from 'react'

import { WindowTitleBar } from '@/components/window-title-bar'
import { StatsView } from '@/features/stats/stats-view'
import { TimerView } from '@/features/timer/timer-view'
import { api } from '@/lib/tauri'
import type { MainView } from '@/lib/tauri'
import { useTimerStore } from '@/store/timer-store'
import { cn } from '@/utils/cn'

export function MainWindow() {
  const [view, setView] = useState<MainView>('timer')

  const switchTo = useCallback(
    (next: MainView) => {
      if (next === view) return
      setView(next)
      void api.resizeMainWindow(next)
    },
    [view],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key === '1') {
        event.preventDefault()
        if (view !== 'timer') {
          switchTo('timer')
          return
        }
        const snapshot = useTimerStore.getState().snapshot
        if (
          snapshot == null ||
          (snapshot.status !== 'idle' && snapshot.status !== 'completed')
        ) {
          return
        }
        void useTimerStore
          .getState()
          .actions.setMode(snapshot.mode === 'timer' ? 'stopwatch' : 'timer')
        return
      }
      if (event.key === '2') {
        event.preventDefault()
        switchTo('stats')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [switchTo, view])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <WindowTitleBar
        title=""
        onOpenSettings={() => void api.openSettings()}
        navigation={
          view === 'timer'
            ? { direction: 'stats', onClick: () => switchTo('stats') }
            : { direction: 'back', onClick: () => switchTo('timer') }
        }
      />
      <div className="relative min-h-0 flex-1">
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
          <StatsView active={view === 'stats'} />
        </div>
      </div>
    </div>
  )
}
