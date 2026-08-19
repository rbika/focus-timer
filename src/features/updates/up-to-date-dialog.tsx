import { useEffect, useRef } from 'react'

import { cn } from '@/utils/cn'

type Props = {
  open: boolean
  appName: string
  version: string
  onClose: () => void
}

export function UpToDateDialog({ open, appName, version, onClose }: Props) {
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    okRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 p-6"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="up-to-date-title"
        aria-describedby="up-to-date-message"
        aria-modal="true"
        className={cn(
          'w-full max-w-[320px] rounded-[22px] bg-[#f5f5f7] p-6 shadow-2xl',
          'dark:bg-[#2c2c2e] dark:shadow-black/40',
        )}
      >
        <h2
          id="up-to-date-title"
          className="mb-2 text-sm font-bold text-neutral-900 dark:text-neutral-50"
        >
          You're up to date!
        </h2>
        <p
          id="up-to-date-message"
          className="mt-1 text-[13px] text-neutral-700 dark:text-neutral-300"
        >
          {appName} {version} is currently the newest version available.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={okRef}
            type="button"
            className="h-8 w-full rounded-full bg-[#007aff] text-sm text-white transition-colors hover:bg-[#0066d6] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
