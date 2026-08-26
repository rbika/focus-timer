import { useEffect, useRef, useState } from 'react'

import { DurationInput } from '@/features/timer/duration-input'
import { maskToSecs, secsToMask } from '@/utils/time'

type Props = {
  id: string
  label: string
  valueSecs: number | null
  onCommit: (secs: number | null) => void
}

export function PresetDurationInput({
  id,
  label,
  valueSecs,
  onCommit,
}: Props) {
  const [mask, setMask] = useState(() => secsToMask(valueSecs ?? 0))
  const editingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editingRef.current) return
    setMask(secsToMask(valueSecs ?? 0))
  }, [valueSecs])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const commit = (nextMask: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const secs = maskToSecs(nextMask)
    onCommit(secs > 0 ? secs : null)
  }

  return (
    <DurationInput
      id={id}
      aria-label={label}
      value={mask}
      onChange={(next) => {
        setMask(next)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null
          const secs = maskToSecs(next)
          onCommit(secs > 0 ? secs : null)
        }, 200)
      }}
      onFocus={() => {
        editingRef.current = true
      }}
      onBlur={() => {
        editingRef.current = false
        const normalized = secsToMask(maskToSecs(mask))
        setMask(normalized)
        commit(normalized)
      }}
      onCommit={() => commit(mask)}
      className="h-7 w-22 text-sm"
    />
  )
}
