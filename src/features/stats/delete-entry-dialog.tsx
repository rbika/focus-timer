import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'

type Props = {
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteEntryDialog({ onCancel, onConfirm }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="delete-entry-title"
        aria-describedby="delete-entry-desc"
        className="w-full rounded-xl bg-[canvas] p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-entry-title"
          className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50"
        >
          Delete this entry?
        </h2>
        <p
          id="delete-entry-desc"
          className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400"
        >
          This can’t be undone.
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
