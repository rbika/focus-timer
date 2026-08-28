import { useEffect, useState } from 'react'

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

import { Button } from '@/components/ui/button'
import { WindowTitleBar } from '@/components/window-title-bar'
import { formatUpdateStatus } from '@/features/updates/format-update-status'
import { api, onUpdateStatus, type UpdateStatus } from '@/lib/tauri'
import appIcon from '../../../src-tauri/icons/128x128.png'

function notesText(notes?: string | null): string {
  const trimmed = notes?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'No release notes provided.'
}

export function UpdateAvailableView() {
  const [appName, setAppName] = useState('Focus Timer')
  const [currentVersion, setCurrentVersion] = useState('')
  const [status, setStatus] = useState<UpdateStatus>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.getAppName().then(setAppName)
    void api.getAppVersion().then(setCurrentVersion)
    void api.getUpdateStatus().then(setStatus)
  }, [])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    void onUpdateStatus(setStatus).then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  }, [])

  useEffect(() => {
    if (
      status.kind === 'readyToRestart' ||
      status.kind === 'cancelled' ||
      status.kind === 'upToDate'
    ) {
      void getCurrentWebviewWindow().hide()
    }
  }, [status.kind])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        void api.dismissAvailableUpdate()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy])

  const latestVersion = status.kind === 'available' ? status.version : null
  const notes = status.kind === 'available' ? status.notes : null
  const progress =
    status.kind === 'downloading' || status.kind === 'installing'
      ? formatUpdateStatus(status)
      : null
  const error =
    status.kind === 'error' ? 'Update failed. Please try again later.' : null

  return (
    <div className="flex h-full flex-col">
      <WindowTitleBar title="" />
      <main className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-5">
        <div className="flex items-center gap-3">
          <img
            src={appIcon}
            alt=""
            className="h-16 w-16 shrink-0"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              A new version of {appName} is available!
            </h1>
            {latestVersion && currentVersion ? (
              <div>
                <p className="text-[13px] leading-5 text-neutral-700 dark:text-neutral-300">
                  {appName} version {latestVersion} is now available. You
                  currently have version {currentVersion} installed.
                </p>
                <p className="text-[13px] leading-5 text-neutral-700 dark:text-neutral-300">
                  Would you like to update it now?
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="text-[13px] leading-5 text-neutral-700 dark:text-neutral-300">
            {error}
          </p>
        ) : progress ? (
          <p className="text-[13px] leading-5 text-neutral-700 dark:text-neutral-300">
            {progress}
          </p>
        ) : (
          <>
            <p className="max-h-24 overflow-y-auto text-[13px] leading-5 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
              {notesText(notes)}
            </p>
          </>
        )}
        <div className="mt-auto flex justify-end gap-2">
          {error ? (
            <Button
              className="h-7 w-full rounded-full bg-[#007aff] px-4 py-2 text-sm hover:bg-[#006ee6] dark:bg-[#0a84ff] dark:text-white"
              onClick={() => void api.dismissAvailableUpdate()}
            >
              OK
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                className="h-7 rounded-full px-4 py-2 text-sm"
                disabled={busy || !!progress}
                onClick={() => void api.dismissAvailableUpdate()}
              >
                Remind me later
              </Button>
              <Button
                className="h-7 rounded-full bg-[#007aff] px-4 py-2 text-sm hover:bg-[#006ee6] dark:bg-[#0a84ff] dark:text-white"
                disabled={busy || !!progress}
                onClick={() => {
                  setBusy(true)
                  void api.installAvailableUpdate().finally(() => {
                    setBusy(false)
                  })
                }}
              >
                Install update
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
