import { useCallback, useEffect, useRef, useState } from 'react'

import { SquarePenIcon } from 'lucide-react'

import { DashboardTab } from '@/features/stats/dashboard-tab'
import { EntriesTab } from '@/features/stats/entries-tab'
import { EntryEditor } from '@/features/stats/entry-editor'
import {
  StatsTabSwitch,
  type StatsTab,
} from '@/features/stats/stats-tab-switch'
import type { Entry } from '@/lib/tauri'
import { cn } from '@/utils/cn'

const SLIDE_MS = 180
const MANUAL_DRAFT_DURATION_SECS = 60

function draftManualEntry(): Entry {
  const endedAtUnix = Math.floor(Date.now() / 1000)
  const startedAtUnix = endedAtUnix - MANUAL_DRAFT_DURATION_SECS
  return {
    id: '',
    mode: 'manual',
    startedAtUnix,
    endedAtUnix,
    durationSecs: MANUAL_DRAFT_DURATION_SECS,
  }
}

export function StatsView({ active }: { active: boolean }) {
  const [tab, setTab] = useState<StatsTab>('dashboard')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [creating, setCreating] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (active) return
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setEditorOpen(false)
    setEditing(null)
    setCreating(false)
  }, [active])

  const openEditor = (entry: Entry) => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setCreating(false)
    setEditing(entry)
    setEditorOpen(true)
  }

  const openCreate = () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setCreating(true)
    setEditing(draftManualEntry())
    setEditorOpen(true)
  }

  const closeEditor = useCallback(() => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setEditorOpen(false)
    closeTimer.current = window.setTimeout(() => {
      setEditing(null)
      setCreating(false)
      closeTimer.current = null
    }, SLIDE_MS)
  }, [])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }
      if (event.key !== '2') return
      event.preventDefault()
      if (editorOpen) return
      setTab((current) => (current === 'dashboard' ? 'entries' : 'dashboard'))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, editorOpen])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className={cn(
          'absolute inset-0 flex min-h-0 flex-col px-4 pt-1 pb-4 transition-transform duration-180 ease-out',
          editorOpen
            ? 'pointer-events-none -translate-x-full'
            : 'translate-x-0',
        )}
      >
        <main className="flex min-h-0 flex-1 flex-col gap-3">
          <StatsTabSwitch tab={tab} onChange={setTab} />
          {tab === 'dashboard' ? (
            <DashboardTab />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-1">
              <button
                type="button"
                onClick={openCreate}
                className="flex shrink-0 items-center gap-1 self-start rounded-sm text-[13px] text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-neutral-500 dark:hover:text-neutral-300"
              >
                <SquarePenIcon className="h-3.5 w-3.5 shrink-0" /> Add entry
              </button>
              <EntriesTab onOpenEntry={openEditor} />
            </div>
          )}
        </main>
      </div>
      <div
        className={cn(
          'absolute inset-0 flex min-h-0 flex-col px-4 pt-1 pb-4 transition-transform duration-180 ease-out',
          editorOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        )}
      >
        {editing ? (
          <EntryEditor
            entry={editing}
            creating={creating}
            active={editorOpen}
            onClose={closeEditor}
          />
        ) : null}
      </div>
    </div>
  )
}
