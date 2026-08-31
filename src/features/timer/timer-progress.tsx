import { useState } from 'react'

type Props = {
  remainingSecs: number
  durationSecs: number
}

/**
 * Ticks are only emitted while the window is visible, so the first snapshot
 * after it reopens can jump by minutes. Animating that jump makes the bar
 * crawl to its real position, so only contiguous one-second steps animate;
 * everything else snaps.
 */
export function TimerProgress({ remainingSecs, durationSecs }: Props) {
  const [shown, setShown] = useState({
    remainingSecs,
    durationSecs,
    animate: false,
  })

  if (
    shown.remainingSecs !== remainingSecs ||
    shown.durationSecs !== durationSecs
  ) {
    setShown({
      remainingSecs,
      durationSecs,
      animate:
        shown.durationSecs === durationSecs &&
        shown.remainingSecs - remainingSecs === 1,
    })
  }

  const percent =
    shown.durationSecs > 0
      ? Math.min(
          100,
          Math.max(0, (shown.remainingSecs / shown.durationSecs) * 100),
        )
      : 0

  return (
    <div
      role="progressbar"
      aria-label="Time remaining"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-1 w-full overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700"
    >
      <div
        className="h-full rounded-full bg-neutral-900 transition-[width] ease-linear dark:bg-neutral-50"
        style={{
          width: `${percent}%`,
          transitionDuration: shown.animate ? '1000ms' : '0ms',
        }}
      />
    </div>
  )
}
