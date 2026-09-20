import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import type { TimerMode } from '@/lib/tauri'
import { cn } from '@/utils/cn'

export const DIALOG_FADE_MS = 150

type Props = {
  mode: TimerMode
  leaving: boolean
  onClose: () => void
  onDiscard: () => void
  onSave: () => void
}

export function RunningIntervalDialog({
  mode,
  leaving,
  onClose,
  onDiscard,
  onSave,
}: Props) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (leaving) {
      setEntered(false)
      return
    }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [leaving])

  const title =
    mode === 'stopwatch' ? 'Stopwatch is running' : 'Timer is running'

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 transition-opacity duration-150',
        entered ? 'opacity-100' : 'opacity-0',
      )}
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-labelledby="running-interval-title"
        aria-describedby="running-interval-desc"
        className={cn(
          'w-full rounded-xl bg-[canvas] p-4 shadow-lg transition-opacity duration-150',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="running-interval-title"
          className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50"
        >
          {title}
        </h2>
        <p
          id="running-interval-desc"
          className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400"
        >
          Save this Entry, or Discard it?
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="secondary" autoFocus onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
              onClick={onDiscard}
            >
              Discard
            </Button>
            <Button type="button" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
