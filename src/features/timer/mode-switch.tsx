import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TimerMode } from '@/lib/tauri'

type Props = {
  mode: TimerMode
  onChange: (mode: TimerMode) => void
}

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        if (value === mode) return
        if (value === 'timer' || value === 'stopwatch') onChange(value)
      }}
      className="w-full shrink-0 gap-0"
    >
      <TabsList className="mx-auto shrink-0">
        <TabsTrigger value="timer" className="w-24 text-xs">
          Timer
        </TabsTrigger>
        <TabsTrigger value="stopwatch" className="w-24 text-xs">
          Stopwatch
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
