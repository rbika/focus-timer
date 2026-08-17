import { useEffect, useState } from 'react'

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

import { SettingsView } from '@/features/settings/settings-view'
import { TimerView } from '@/features/timer/timer-view'
import { ReleaseNotesView } from '@/features/updates/release-notes-view'
import { subscribeToBackend } from '@/store/timer-store'

export default function App() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const windowLabel = getCurrentWebviewWindow().label
    setLabel(windowLabel)
    void subscribeToBackend()
  }, [])

  if (!label) {
    return null
  }

  if (label === 'settings') {
    return (
      <div className="h-full bg-[canvas]">
        <SettingsView />
      </div>
    )
  }

  if (label === 'release-notes') {
    return (
      <div className="h-full bg-[canvas]">
        <ReleaseNotesView />
      </div>
    )
  }

  return (
    <div className="h-full bg-[canvas]">
      <TimerView />
    </div>
  )
}
