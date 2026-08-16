import { useEffect, useState } from 'react'

import {
  SettingsGroup,
  SettingsGroupContent,
  SettingsGroupItem,
  SettingsGroupItemControl,
  SettingsGroupItemLabel,
  SettingsGroupTitle,
} from '@/components/settings-group'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { WindowTitleBar } from '@/components/window-title-bar'
import { api, type Settings } from '@/lib/tauri'
import { useTimerStore } from '@/store/timer-store'

export function SettingsView() {
  const settings = useTimerStore((s) => s.settings)
  const saveSettings = useTimerStore((s) => s.actions.saveSettings)
  const [sounds, setSounds] = useState<string[]>([])
  const [appName, setAppName] = useState('Focus Timer')
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    void api.getSystemSounds().then(setSounds)
    void api.getAppName().then(setAppName)
    void api.getAppVersion().then(setAppVersion)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'q') {
        event.preventDefault()
        void api.quitApp()
      }
      if (event.metaKey && event.key === ',') {
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const current = useTimerStore.getState().settings
    if (!current) return
    void saveSettings({ ...current, [key]: value })
  }

  return (
    <div className="flex h-full flex-col">
      <WindowTitleBar title="Settings" />
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-4 pb-8">
        <SettingsGroup>
          <SettingsGroupTitle>General Behavior</SettingsGroupTitle>
          <SettingsGroupContent>
            <SettingsGroupItem>
              <SettingsGroupItemLabel htmlFor="start-at-login">
                Start at login
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <Switch
                  id="start-at-login"
                  checked={settings.startAtLogin}
                  onCheckedChange={(value) => update('startAtLogin', value)}
                  aria-label="Start at login"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
            <SettingsGroupItem>
              <SettingsGroupItemLabel htmlFor="hide-on-start">
                Hide window when timer starts
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <Switch
                  id="hide-on-start"
                  checked={settings.hideWindowOnStart}
                  onCheckedChange={(value) =>
                    update('hideWindowOnStart', value)
                  }
                  aria-label="Hide window when timer starts"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
            <SettingsGroupItem>
              <SettingsGroupItemLabel htmlFor="pause-on-sleep">
                Pause when Mac sleeps
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <Switch
                  id="pause-on-sleep"
                  checked={settings.pauseOnSleep}
                  onCheckedChange={(value) => update('pauseOnSleep', value)}
                  aria-label="Pause when Mac sleeps"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
          </SettingsGroupContent>
        </SettingsGroup>

        <SettingsGroup>
          <SettingsGroupTitle>Appearance</SettingsGroupTitle>
          <SettingsGroupContent>
            <SettingsGroupItem>
              <SettingsGroupItemLabel htmlFor="icon-only">
                Icon only in menu bar
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <Switch
                  id="icon-only"
                  checked={settings.iconOnly}
                  onCheckedChange={(value) => update('iconOnly', value)}
                  aria-label="Icon only in menu bar"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
          </SettingsGroupContent>
        </SettingsGroup>

        <SettingsGroup>
          <SettingsGroupTitle>Sounds</SettingsGroupTitle>
          <SettingsGroupContent>
            <SettingsGroupItem>
              <SettingsGroupItemLabel htmlFor="sound-enabled">
                Play completion sound
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <Switch
                  id="sound-enabled"
                  checked={settings.soundEnabled}
                  onCheckedChange={(value) => update('soundEnabled', value)}
                  aria-label="Play completion sound"
                />
              </SettingsGroupItemControl>
            </SettingsGroupItem>
            <SettingsGroupItem>
              <SettingsGroupItemLabel htmlFor="completion-sound">
                Completion sound
              </SettingsGroupItemLabel>
              <SettingsGroupItemControl>
                <Select
                  id="completion-sound"
                  value={settings.completionSound}
                  disabled={!settings.soundEnabled}
                  onChange={(e) => {
                    const name = e.target.value
                    update('completionSound', name)
                    void api.previewSound(name)
                  }}
                >
                  {sounds.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </SettingsGroupItemControl>
            </SettingsGroupItem>
          </SettingsGroupContent>
        </SettingsGroup>

        <section className="mt-auto flex flex-col items-center gap-2 pt-4 pb-2 text-center">
          <p className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
            {appName}
          </p>
          <div className="flex gap-2">
            <p className="text-xs text-neutral-500">
              {appVersion ? `Version ${appVersion}` : '\u00a0'}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              © {new Date().getFullYear()} rbika
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
