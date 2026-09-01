import { useEffect, useState } from 'react'

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

import { Button } from '@/components/ui/button'
import { WindowTitleBar } from '@/components/window-title-bar'
import { formatDownloadProgress } from '@/features/updates/format-bytes'
import { api, onUpdateStatus, type UpdateStatus } from '@/lib/tauri'
import appIcon from '../../../src-tauri/icons/128x128.png'

function downloadPercent(downloaded: number, total?: number | null): number {
  if (!total || total <= 0) {
    return 0
  }

  return Math.min(100, Math.round((downloaded / total) * 100))
}

export function UpdateProgressView() {
  const [status, setStatus] = useState<UpdateStatus>({ kind: 'idle' })

  useEffect(() => {
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
    if (status.kind === 'cancelled' || status.kind === 'available') {
      void getCurrentWebviewWindow().hide()
    }
  }, [status.kind])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      if (status.kind === 'downloading' || status.kind === 'installing') {
        void api.cancelUpdateDownload()
      } else if (status.kind === 'readyToRestart') {
        void api.dismissUpdateProgress()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [status.kind])

  const isDownloading = status.kind === 'downloading'
  const isInstalling = status.kind === 'installing'
  const isReady = status.kind === 'readyToRestart'
  const isError = status.kind === 'error'

  const title = isReady
    ? 'Restart to Update'
    : isInstalling
      ? 'Installing update…'
      : isError
        ? 'Update failed'
        : 'Downloading update…'

  const progressLabel =
    isDownloading && status.kind === 'downloading'
      ? formatDownloadProgress(status.downloaded, status.total)
      : null

  const percent =
    isDownloading && status.kind === 'downloading'
      ? downloadPercent(status.downloaded, status.total)
      : isInstalling
        ? 100
        : 0

  return (
    <div className="flex h-full flex-col bg-[canvas]">
      <WindowTitleBar title="" />
      <main className="flex min-h-0 flex-1 items-center gap-4 px-5 pb-4">
        <img
          src={appIcon}
          alt=""
          className="h-16 w-16 shrink-0 rounded-[14px]"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[13px] text-neutral-900 dark:text-neutral-50">
            {title}
          </p>

          {!isReady && !isError ? (
            <div
              className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={title}
            >
              <div
                className={`h-full rounded-full bg-[#007aff] transition-[width] duration-150 ease-out dark:bg-[#0a84ff] ${
                  isInstalling ? 'animate-pulse' : ''
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            {isError ? (
              <p className="text-[12px] leading-4 text-neutral-600 dark:text-neutral-400">
                Please try again later.
              </p>
            ) : isReady ? (
              <p className="text-[12px] leading-4 text-neutral-600 dark:text-neutral-400">
                {status.kind === 'readyToRestart'
                  ? `Version ${status.version} is ready to install.`
                  : null}
              </p>
            ) : (
              <p className="text-[12px] leading-4 text-neutral-600 tabular-nums dark:text-neutral-400">
                {progressLabel ?? '\u00a0'}
              </p>
            )}

            {isReady ? (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  className="h-7 rounded-full px-4 py-2 text-sm"
                  onClick={() => void api.dismissUpdateProgress()}
                >
                  Later
                </Button>
                <Button
                  className="h-7 rounded-full bg-[#007aff] px-4 py-2 text-sm hover:bg-[#006ee6] dark:bg-[#0a84ff] dark:text-white"
                  onClick={() => void api.restartForUpdate()}
                >
                  Restart
                </Button>
              </div>
            ) : isError ? (
              <Button
                variant="secondary"
                className="h-7 shrink-0 rounded-full border border-[#007aff] px-4 py-2 text-sm dark:border-[#0a84ff]"
                onClick={() => void api.dismissUpdateProgress()}
              >
                OK
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="h-7 shrink-0 rounded-full border border-[#007aff] px-4 py-2 text-sm dark:border-[#0a84ff]"
                onClick={() => void api.cancelUpdateDownload()}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
