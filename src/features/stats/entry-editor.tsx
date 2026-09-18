import { useEffect, useState } from 'react'

import { ChevronLeft, Hourglass, Timer } from 'lucide-react'

import {
  SettingsGroup,
  SettingsGroupContent,
  SettingsGroupItem,
  SettingsGroupItemControl,
  SettingsGroupItemLabel,
} from '@/components/settings-group'
import { Button } from '@/components/ui/button'
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/features/stats/datetime-local'
import { DeleteEntryDialog } from '@/features/stats/delete-entry-dialog'
import { api, type Entry } from '@/lib/tauri'
import { secsToTotalLabel } from '@/utils/time'

type Props = {
  entry: Entry
  active: boolean
  onClose: () => void
}

export function EntryEditor({ entry, active, onClose }: Props) {
  const [started, setStarted] = useState(() =>
    toDatetimeLocalValue(entry.startedAtUnix),
  )
  const [ended, setEnded] = useState(() =>
    toDatetimeLocalValue(entry.endedAtUnix),
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [persistError, setPersistError] = useState<'save' | 'delete' | null>(
    null,
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!active) return
    setStarted(toDatetimeLocalValue(entry.startedAtUnix))
    setEnded(toDatetimeLocalValue(entry.endedAtUnix))
    setConfirmDelete(false)
    setPersistError(null)
    // Reset only when the editor is opened, not when the stored Entry
    // identity changes behind the local draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (confirmDelete) {
        setConfirmDelete(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, confirmDelete, onClose])

  const startedUnix = fromDatetimeLocalValue(started)
  const endedUnix = fromDatetimeLocalValue(ended)
  const rangeValid =
    startedUnix != null && endedUnix != null && endedUnix > startedUnix
  const durationSecs = rangeValid ? endedUnix - startedUnix : 0
  const dirty =
    startedUnix !== entry.startedAtUnix || endedUnix !== entry.endedAtUnix
  const canSave = rangeValid && dirty && !saving
  const ModeIcon = entry.mode === 'timer' ? Hourglass : Timer
  const modeLabel = entry.mode === 'timer' ? 'Timer' : 'Stopwatch'

  const footerMessage = persistError
    ? persistError === 'save'
      ? 'Couldn’t save'
      : 'Couldn’t delete'
    : rangeValid
      ? null
      : 'Invalid range'

  const onDraftChange = (field: 'started' | 'ended', value: string) => {
    setPersistError(null)
    if (field === 'started') setStarted(value)
    else setEnded(value)
  }

  const save = async () => {
    if (!canSave || startedUnix == null || endedUnix == null) return
    setSaving(true)
    try {
      await api.updateEntry(entry.id, startedUnix, endedUnix)
      onClose()
    } catch {
      setPersistError('save')
    } finally {
      setSaving(false)
    }
  }

  const confirmAndDelete = async () => {
    setConfirmDelete(false)
    try {
      await api.deleteEntry(entry.id)
      onClose()
    } catch {
      setPersistError('delete')
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      inert={confirmDelete || !active ? true : undefined}
    >
      <div className="-ml-1.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-7 gap-0.5 px-1.5 text-[13px]"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-1">
        <SettingsGroup>
          <SettingsGroupContent>
            <SettingsGroupItem>
              <SettingsGroupItemLabel>Type</SettingsGroupItemLabel>
              <SettingsGroupItemControl className="gap-1.5 text-[13px] text-neutral-800 dark:text-neutral-100">
                <ModeIcon
                  className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400"
                  aria-hidden
                />
                {modeLabel}
              </SettingsGroupItemControl>
            </SettingsGroupItem>
            <SettingsGroupItem className="flex-wrap">
              <SettingsGroupItemLabel htmlFor="entry-started">
                Started
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <input
                  id="entry-started"
                  type="datetime-local"
                  step={1}
                  value={started}
                  onChange={(event) =>
                    onDraftChange('started', event.target.value)
                  }
                  className="max-w-[168px] min-w-0 bg-transparent text-right text-[12px] text-neutral-800 tabular-nums outline-none dark:text-neutral-100"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
            <SettingsGroupItem className="flex-wrap">
              <SettingsGroupItemLabel htmlFor="entry-ended">
                Ended
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <input
                  id="entry-ended"
                  type="datetime-local"
                  step={1}
                  value={ended}
                  onChange={(event) =>
                    onDraftChange('ended', event.target.value)
                  }
                  className="max-w-[168px] min-w-0 bg-transparent text-right text-[12px] text-neutral-800 tabular-nums outline-none dark:text-neutral-100"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
            <SettingsGroupItem>
              <SettingsGroupItemLabel>Duration</SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <span className="text-[13px] font-medium text-neutral-900 tabular-nums dark:text-neutral-50">
                  {secsToTotalLabel(durationSecs)}
                </span>
              </SettingsGroupItemControl>
            </SettingsGroupItem>
          </SettingsGroupContent>
        </SettingsGroup>
      </div>

      <div className="shrink-0 pt-2">
        {footerMessage ? (
          <p className="mb-2 text-center text-xs text-red-600 dark:text-red-400">
            {footerMessage}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/10"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => void save()}
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {confirmDelete ? (
        <DeleteEntryDialog
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void confirmAndDelete()}
        />
      ) : null}
    </div>
  )
}
