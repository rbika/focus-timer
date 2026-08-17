import { BoltIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function WindowTitleBar({
  title,
  onOpenSettings,
}: {
  title: string
  onOpenSettings?: () => void
}) {
  return (
    <div
      data-tauri-drag-region
      className="relative flex h-8 shrink-0 items-center justify-center"
    >
      <span
        data-tauri-drag-region
        className="text-[13px] font-semibold text-neutral-900 select-none dark:text-neutral-50"
      >
        {title}
      </span>
      {onOpenSettings && (
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="absolute right-0.5 h-7 w-7 rounded-xl p-0 opacity-60 transition-opacity hover:bg-transparent hover:opacity-100 dark:hover:bg-transparent"
        >
          <BoltIcon className="h-3.5 w-3.5" aria-hidden />
        </Button>
      )}
    </div>
  )
}
