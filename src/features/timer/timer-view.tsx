import { useCallback, useEffect, useRef, useState } from 'react'

import { Bell, Pause, Play, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { WindowTitleBar } from '@/components/window-title-bar'
import { DurationInput } from '@/features/timer/duration-input'
import { api } from '@/lib/tauri'
import { useTimerStore } from '@/store/timer-store'
import { maskToSecs, secsToMask } from '@/utils/time'

export function TimerView() {
  const snapshot = useTimerStore((s) => s.snapshot)
  const ready = useTimerStore((s) => s.ready)
  const togglePause = useTimerStore((s) => s.actions.togglePause)
  const reset = useTimerStore((s) => s.actions.reset)
  const setDuration = useTimerStore((s) => s.actions.setDuration)

  const [mask, setMask] = useState('00:25:00')
  const editingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genRef = useRef(0)
  const intendedSecsRef = useRef<number | null>(null)
  const queueRef = useRef(Promise.resolve())

  const runExclusive = useCallback((task: () => Promise<void>) => {
    const run = queueRef.current.then(task, task)
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }, [])

  const syncDuration = useCallback(
    async (secs: number, gen: number) => {
      if (gen !== genRef.current) return
      const current = useTimerStore.getState().snapshot
      if (!current) return
      if (current.status !== 'idle' && current.status !== 'completed') return
      if (current.durationSecs === secs) return
      try {
        await setDuration(secs)
      } catch {
        if (gen === genRef.current) intendedSecsRef.current = null
      }
    },
    [setDuration],
  )

  const commitDuration = useCallback(
    (nextMask: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      const gen = ++genRef.current
      const secs = maskToSecs(nextMask)
      intendedSecsRef.current = secs
      return runExclusive(() => syncDuration(secs, gen))
    },
    [runExclusive, syncDuration],
  )

  const handleMaskChange = useCallback(
    (next: string) => {
      setMask(next)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const gen = ++genRef.current
      const secs = maskToSecs(next)
      intendedSecsRef.current = secs
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        void runExclusive(() => syncDuration(secs, gen))
      }, 200)
    },
    [runExclusive, syncDuration],
  )

  const handleStart = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const gen = ++genRef.current
    const secs = maskToSecs(mask)
    intendedSecsRef.current = secs
    await runExclusive(async () => {
      await syncDuration(secs, gen)
      await togglePause()
    })
  }, [mask, runExclusive, syncDuration, togglePause])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Engine is the source of truth when we're not typing. Ignore snapshots
  // that don't match the latest local intent (stale in-flight setDuration).
  useEffect(() => {
    const current = useTimerStore.getState().snapshot
    if (!current) return
    if (editingRef.current) return
    if (current.status !== 'idle' && current.status !== 'completed') return
    if (
      intendedSecsRef.current !== null &&
      current.durationSecs !== intendedSecsRef.current
    ) {
      return
    }
    intendedSecsRef.current = null
    setMask((mask) => {
      const next = secsToMask(current.durationSecs)
      return mask === next ? mask : next
    })
  }, [snapshot?.status, snapshot?.durationSecs])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === ',') {
        event.preventDefault()
        void api.openSettings()
        return
      }
      if (event.metaKey && event.key.toLowerCase() === 'q') {
        event.preventDefault()
        void api.quitApp()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        void api.hideTimerWindow()
        return
      }
      if (event.code === 'Space') {
        const target = event.target as HTMLElement | null
        const tag = target?.tagName
        // Don't hijack space while typing in a field or activating a
        // focused button (which already handles space via its own click).
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'BUTTON' ||
          target?.isContentEditable
        ) {
          return
        }
        event.preventDefault()
        if (!snapshot) return
        const isActive =
          snapshot.status === 'running' || snapshot.status === 'paused'
        if (isActive) {
          void togglePause()
        } else {
          void handleStart()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [snapshot, togglePause, handleStart])

  if (!ready || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  const isRunning = snapshot.status === 'running'
  const isPaused = snapshot.status === 'paused'
  const isActive = isRunning || isPaused
  const endsAt = isRunning
    ? new Date(Date.now() + snapshot.remainingSecs * 1000).toLocaleTimeString(
        undefined,
        { hour: 'numeric', minute: '2-digit' },
      )
    : '--:--'

  return (
    <div className="flex h-full flex-col">
      <WindowTitleBar
        title="Focus Timer"
        onOpenSettings={() => void api.openSettings()}
      />
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-3">
        {isActive ? (
          <>
            <div className="flex flex-col items-center gap-1">
              <time
                dateTime={`PT${snapshot.remainingSecs}S`}
                aria-live="polite"
                aria-atomic="true"
                className="text-4xl font-light tracking-tight text-neutral-900 tabular-nums dark:text-neutral-50"
              >
                {snapshot.formatted}
              </time>

              <div
                className={`flex h-4 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 ${isPaused ? 'opacity-60' : ''}`}
                aria-live="polite"
              >
                <Bell className="h-3 w-3" aria-hidden />
                <span>Ends at {endsAt}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => void togglePause()}
                aria-label={isRunning ? 'Pause' : 'Resume'}
                className="w-24 gap-1.5"
              >
                {isRunning ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                )}
                {isRunning ? 'Pause' : 'Resume'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void reset()}
                aria-label="Cancel timer"
                className="w-24 gap-1.5"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <DurationInput
              value={mask}
              onChange={handleMaskChange}
              onFocus={() => {
                editingRef.current = true
              }}
              onBlur={() => {
                editingRef.current = false
                const normalized = secsToMask(maskToSecs(mask))
                setMask(normalized)
                void commitDuration(normalized)
              }}
              onCommit={() => void handleStart()}
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={() => void handleStart()}
                aria-label="Start"
                className="w-24 gap-1.5"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Start
              </Button>
              <Button
                variant="secondary"
                disabled
                aria-label="Cancel timer"
                className="w-24 gap-1.5"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Cancel
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
