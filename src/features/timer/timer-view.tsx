import { useCallback, useEffect, useRef, useState } from 'react'

import { Bell, Pause, Play, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { WindowTitleBar } from '@/components/window-title-bar'
import { api } from '@/lib/tauri'
import { useTimerStore } from '@/store/timer-store'
import { partsToSecs, secsToParts } from '@/utils/time'

export function TimerView() {
  const snapshot = useTimerStore((s) => s.snapshot)
  const ready = useTimerStore((s) => s.ready)
  const togglePause = useTimerStore((s) => s.actions.togglePause)
  const reset = useTimerStore((s) => s.actions.reset)
  const setDuration = useTimerStore((s) => s.actions.setDuration)

  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)

  const handleStart = useCallback(async () => {
    await setDuration(partsToSecs(hours, minutes, seconds))
    await togglePause()
  }, [setDuration, togglePause, hours, minutes, seconds])

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

  // Keep the duration inputs in sync with the engine's duration whenever
  // there is no active session (i.e. right after start/cancel/completion).
  useEffect(() => {
    if (!snapshot) return
    if (snapshot.status === 'idle' || snapshot.status === 'completed') {
      const parts = secsToParts(snapshot.durationSecs)
      setHours(parts.hours)
      setMinutes(parts.minutes)
      setSeconds(parts.seconds)
    }
  }, [snapshot?.status, snapshot?.durationSecs, snapshot])

  // Push edits to the input fields down to the engine (debounced) so the
  // tray title stays in sync while the user is typing, without duplicating
  // timer/formatting logic on the frontend. Skipped while a session is
  // active since the backend rejects duration changes then.
  useEffect(() => {
    if (!snapshot) return
    if (snapshot.status !== 'idle' && snapshot.status !== 'completed') return
    const totalSecs = partsToSecs(hours, minutes, seconds)
    if (totalSecs === snapshot.durationSecs) return
    const timeout = setTimeout(() => {
      void setDuration(totalSecs).catch(() => {})
    }, 150)
    return () => clearTimeout(timeout)
  }, [
    hours,
    minutes,
    seconds,
    snapshot?.status,
    snapshot?.durationSecs,
    setDuration,
    snapshot,
  ])

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
            <div className="flex items-center gap-1.5">
              <DurationField
                label="Hours"
                value={hours}
                max={23}
                onChange={setHours}
              />
              <span className="pb-4 text-lg font-light text-neutral-400">
                :
              </span>
              <DurationField
                label="Min"
                value={minutes}
                max={59}
                onChange={setMinutes}
              />
              <span className="pb-4 text-lg font-light text-neutral-400">
                :
              </span>
              <DurationField
                label="Sec"
                value={seconds}
                max={59}
                onChange={setSeconds}
              />
            </div>

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

function DurationField({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const pinCaretToEnd = () => {
    const el = inputRef.current
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  }

  // Controlled value re-renders can reset the caret; pin it back to the end
  // so digits always append (odometer-style) instead of inserting mid-string.
  useEffect(() => {
    if (document.activeElement === inputRef.current) pinCaretToEnd()
  }, [value])

  return (
    <label className="flex flex-col items-center gap-1 text-[10px] tracking-wide text-neutral-500 uppercase">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value.toString().padStart(2, '0')}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          if (digits === '') {
            onChange(0)
            return
          }
          onChange(Math.min(max, Number(digits.slice(-2))))
        }}
        onFocus={pinCaretToEnd}
        onClick={pinCaretToEnd}
        onSelect={pinCaretToEnd}
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault()
          }
        }}
        className="h-10 w-14 rounded-md border border-neutral-300 bg-white text-center text-lg text-neutral-900 tabular-nums dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
      />
      {label}
    </label>
  )
}
