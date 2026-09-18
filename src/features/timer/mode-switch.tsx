import { SegmentedControl } from '@/components/ui/segmented-control'
import type { TimerMode } from '@/lib/tauri'

type Props = {
  mode: TimerMode
  onChange: (mode: TimerMode) => void
}

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <SegmentedControl
      value={mode}
      options={[
        { value: 'timer', label: 'Timer' },
        { value: 'stopwatch', label: 'Stopwatch' },
      ]}
      onChange={(next) => {
        if (next !== mode) onChange(next)
      }}
    />
  )
}
