import { useCallback, useEffect, useRef, useState } from 'react'

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

export function StatsView({ active }: { active: boolean }) {
  const [tab, setTab] = useState<StatsTab>('dashboard')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (active) return
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setEditorOpen(false)
    setEditing(null)
  }, [active])

  const openEditor = (entry: Entry) => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setEditing(entry)
    setEditorOpen(true)
  }

  const closeEditor = useCallback(() => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    setEditorOpen(false)
    closeTimer.current = window.setTimeout(() => {
      setEditing(null)
      closeTimer.current = null
    }, SLIDE_MS)
  }, [])

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
            <EntriesTab onOpenEntry={openEditor} />
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
            active={editorOpen}
            onClose={closeEditor}
          />
        ) : null}
      </div>
    </div>
  )
}
