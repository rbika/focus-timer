import { useCallback, useEffect, useRef, useState } from 'react'

import { Hourglass, Pause, Play, Timer, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { WindowTitleBar } from '@/components/window-title-bar'
import { DurationInput } from '@/features/timer/duration-input'
import { ModeSwitch } from '@/features/timer/mode-switch'
import { TimerProgress } from '@/features/timer/timer-progress'
import { api } from '@/lib/tauri'
import type { TimerMode } from '@/lib/tauri'
import { useTimerStore } from '@/store/timer-store'
import { cn } from '@/utils/cn'
import { maskToSecs, secsToCompact, secsToMask } from '@/utils/time'

export function TimerView() {
  const snapshot = useTimerStore((s) => s.snapshot)
  const settings = useTimerStore((s) => s.settings)
  const ready = useTimerStore((s) => s.ready)
  const togglePause = useTimerStore((s) => s.actions.togglePause)
  const reset = useTimerStore((s) => s.actions.reset)
  const setDuration = useTimerStore((s) => s.actions.setDuration)
  const setMode = useTimerStore((s) => s.actions.setMode)

  const [mask, setMask] = useState('00:00:00')
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

  const applyPreset = useCallback(
    (secs: number) => {
      editingRef.current = false
      const next = secsToMask(secs)
      setMask(next)
      void commitDuration(next)
    },
    [commitDuration],
  )

  const handleStart = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const current = useTimerStore.getState().snapshot
    if (current?.mode === 'stopwatch') {
      await togglePause()
      return
    }
    const gen = ++genRef.current
    const secs = maskToSecs(mask)
    intendedSecsRef.current = secs
    await runExclusive(async () => {
      await syncDuration(secs, gen)
      if (secs > 0) await togglePause()
    })
  }, [mask, runExclusive, syncDuration, togglePause])

  const handleModeChange = useCallback(
    (mode: TimerMode) => {
      void setMode(mode)
    },
    [setMode],
  )

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
  const isStopwatch = snapshot.mode === 'stopwatch'
  const canStart = isStopwatch || maskToSecs(mask) > 0
  const endsAt = isRunning
    ? new Date(Date.now() + snapshot.remainingSecs * 1000).toLocaleTimeString(
        undefined,
        { hour: 'numeric', minute: '2-digit' },
      )
    : '--:--'
  const configuredPresets = (settings?.presets ?? []).flatMap((secs, index) =>
    secs != null && secs > 0 ? [{ index, secs }] : [],
  )

  return (
    <div className="flex h-full flex-col">
      <WindowTitleBar title="" onOpenSettings={() => void api.openSettings()} />
      <main className="flex flex-1 flex-col items-center justify-between gap-2 px-4 pt-1 pb-4">
        {isActive ? (
          <div className="flex h-full w-full flex-col items-center justify-between gap-3">
            <div
              className={cn(
                'flex h-7 w-full items-center justify-center gap-1.5 text-sm font-medium text-neutral-900 transition-opacity duration-200 dark:text-neutral-50',
                isPaused && 'opacity-60',
              )}
              aria-label={isStopwatch ? 'Stopwatch mode' : 'Timer mode'}
            >
              {isStopwatch ? (
                <>
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  Stopwatch
                </>
              ) : (
                <>
                  <Hourglass className="h-3.5 w-3.5" aria-hidden />
                  Timer
                </>
              )}
            </div>

            <div className="flex w-full flex-col items-center gap-1">
              <time
                dateTime={`PT${isStopwatch ? snapshot.elapsedSecs : snapshot.remainingSecs}S`}
                aria-live="polite"
                aria-atomic="true"
                className={cn(
                  'text-4xl font-light tracking-tight text-neutral-900 tabular-nums transition-opacity duration-200 dark:text-neutral-50',
                  isPaused && 'opacity-60',
                )}
              >
                {snapshot.formatted}
              </time>

              <div
                className={cn(
                  'mb-4 flex w-full flex-col items-center gap-3 text-xs text-neutral-500 transition-opacity duration-200 dark:text-neutral-400',
                  isPaused && 'opacity-60',
                )}
                aria-live="polite"
              >
                {isStopwatch ? (
                  <span>No end time</span>
                ) : (
                  <>
                    <div className="mt-1 flex w-[80%] items-center gap-1.5">
                      <span className="w-20 text-right">{endsAt}</span>
                      <TimerProgress
                        remainingSecs={snapshot.remainingSecs}
                        durationSecs={snapshot.durationSecs}
                        running={isRunning}
                      />
                      <span className="w-20 text-left">
                        {secsToCompact(snapshot.durationSecs)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex w-full items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => void reset()}
                aria-label="Cancel timer"
                className="flex-1 gap-1.5"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Cancel
              </Button>
              <Button
                onClick={() => void togglePause()}
                aria-label={isRunning ? 'Pause' : 'Resume'}
                className="flex-1 gap-1.5"
              >
                {isRunning ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                )}
                {isRunning ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-full w-full min-w-0 flex-col items-center justify-between gap-3">
              <ModeSwitch mode={snapshot.mode} onChange={handleModeChange} />

              {isStopwatch ? (
                <div className="mb-[35px] text-4xl font-light tracking-tight text-neutral-900 tabular-nums opacity-60 dark:text-neutral-50">
                  00:00:00
                </div>
              ) : (
                <div className="flex w-full flex-col gap-1.5">
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

                  {configuredPresets.length > 0 ? (
                    <div className="flex w-full justify-center gap-1.5">
                      <div className="flex min-w-0 gap-1.5">
                        {configuredPresets.map(({ index, secs }) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => applyPreset(secs)}
                            aria-label={`Use preset ${secsToCompact(secs)}`}
                            className="h-5 min-w-0 rounded px-2 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700/70"
                          >
                            {secsToCompact(secs)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex w-full items-center gap-2">
                <Button
                  variant="secondary"
                  disabled
                  aria-label="Cancel timer"
                  className="flex-1 gap-1.5"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleStart()}
                  disabled={!canStart}
                  aria-label="Start"
                  className="flex-1 gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Start
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
