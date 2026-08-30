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
        onClick={() =>
          handleSwitchMode(isTimerSelected ? 'stopwatch' : 'timer')
        }
        aria-label={
          isTimerSelected
            ? 'Timer mode, switch to stopwatch'
            : 'Stopwatch mode, switch to timer'
        }
        className="relative grid h-7 w-[92px] shrink-0 grid-cols-2 items-center rounded-full bg-neutral-200/80 p-0.5 dark:bg-neutral-700/80"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0.5 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-[left] duration-200 dark:bg-neutral-100',
            isTimerSelected ? 'left-[2px]' : 'left-[calc(50%+2px)]',
          )}
        />
        <span className="relative z-10 flex items-center justify-center">
          <Hourglass
            className={cn(
              'h-3.5 w-3.5 -translate-x-px transition-colors',
              isTimerSelected
                ? 'text-neutral-700 dark:text-neutral-800'
                : 'text-neutral-400/70 dark:text-neutral-500',
            )}
          />
        </span>
        <span className="relative z-10 flex items-center justify-center">
          <Timer
            className={cn(
              'h-3.5 w-3.5 translate-x-px transition-colors',
              !isTimerSelected
                ? 'text-neutral-700 dark:text-neutral-800'
                : 'text-neutral-400/70 dark:text-neutral-500',
            )}
          />
        </span>
      </button>

      <div className="text-sm text-neutral-900 dark:text-neutral-50">
        {isTimerSelected ? 'Timer' : 'Stopwatch'}
      </div>
    </div>
  )
}
