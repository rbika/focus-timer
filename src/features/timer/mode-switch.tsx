import { Hourglass, Timer } from 'lucide-react'

import type { TimerMode } from '@/lib/tauri'
import { cn } from '@/utils/cn'

type Props = {
  mode: TimerMode
  onChange: (mode: TimerMode) => void
}

export function ModeSwitch({ mode, onChange }: Props) {
  const isTimerSelected = mode === 'timer'

  const handleSwitchMode = (next: TimerMode) => {
    if (next !== mode) onChange(next)
  }

  return (
    <div className="flex w-full max-w-full min-w-0 items-center gap-2.5">
      <button
        type="button"
        onClick={() => handleSwitchMode('timer')}
        className={cn(
          'w-20 text-right text-sm font-medium transition-opacity',
          isTimerSelected
            ? 'text-neutral-900 dark:text-neutral-50'
            : 'text-neutral-400/80 dark:text-neutral-500',
        )}
      >
        Timer
      </button>

      <button
        type="button"
        onClick={() =>
          handleSwitchMode(isTimerSelected ? 'stopwatch' : 'timer')
        }
        aria-label={
          isTimerSelected
            ? 'Timer mode, switch to stopwatch'
            : 'Stopwatch mode, switch to timer'
        }
        className="relative flex h-7 w-24 shrink-0 items-center rounded-full bg-neutral-200/80 p-0.5 dark:bg-neutral-700/80"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0.5 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-[left] duration-200 dark:bg-neutral-100',
            isTimerSelected ? 'left-0.5' : 'left-[calc(50%+2px)]',
          )}
        />
        <span className="relative z-10 flex flex-1 items-center justify-center">
          <Hourglass
            className={cn(
              'h-3.5 w-3.5 transition-colors',
              isTimerSelected
                ? 'text-neutral-700 dark:text-neutral-800'
                : 'text-neutral-400/70 dark:text-neutral-500',
            )}
          />
        </span>
        <span className="relative z-10 flex flex-1 items-center justify-center">
          <Timer
            className={cn(
              'h-3.5 w-3.5 transition-colors',
              !isTimerSelected
                ? 'text-neutral-700 dark:text-neutral-800'
                : 'text-neutral-400/70 dark:text-neutral-500',
            )}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={() => handleSwitchMode('stopwatch')}
        className={cn(
          'w-20 text-left text-sm font-medium transition-opacity',
          !isTimerSelected
            ? 'text-neutral-900 dark:text-neutral-50'
            : 'text-neutral-400/80 dark:text-neutral-500',
        )}
      >
        Stopwatch
      </button>
    </div>
  )
}
