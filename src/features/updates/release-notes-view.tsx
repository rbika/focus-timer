import { useEffect, useState } from 'react'

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { openUrl } from '@tauri-apps/plugin-opener'

import { Button } from '@/components/ui/button'
import { WindowTitleBar } from '@/components/window-title-bar'
import { api, type PendingReleaseNotes } from '@/lib/tauri'

function formatReleaseDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ReleaseNotesView() {
  const [release, setRelease] = useState<PendingReleaseNotes | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const pending = await api.getPendingReleaseNotes()
      if (cancelled) return
      setRelease(pending)
      setReady(true)
      if (pending) {
        // Acknowledge only after the view has mounted and loaded notes.
        await api.acknowledgeReleaseNotes()
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void getCurrentWebviewWindow().hide()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const dateLabel = formatReleaseDate(release?.date)
  const notes = release?.notes?.trim() || 'No release notes were included.'
  const releaseUrl = release
    ? `https://github.com/rbika/focus-timer/releases/tag/v${release.version.replace(/^v/, '')}`
    : null

  return (
    <div className="flex h-full flex-col">
      <WindowTitleBar title="Release Notes" />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-3 pb-5">
        {!ready ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : !release ? (
          <p className="text-sm text-neutral-500">No recent update notes.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                Updated to version {release.version.replace(/^v/, '')}
              </h1>
              {dateLabel ? (
                <p className="text-xs text-neutral-500">{dateLabel}</p>
              ) : null}
            </div>

            <pre className="flex-1 rounded-[10px] bg-neutral-100/60 p-3 font-sans text-[13px] leading-5 whitespace-pre-wrap text-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100">
              {notes}
            </pre>

            <div className="flex items-center justify-between gap-3">
              {releaseUrl ? (
                <Button
                  variant="ghost"
                  className="px-2"
                  onClick={() => void openUrl(releaseUrl)}
                >
                  View on GitHub
                </Button>
              ) : (
                <span />
              )}
              <Button
                variant="secondary"
                onClick={() => void getCurrentWebviewWindow().hide()}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
