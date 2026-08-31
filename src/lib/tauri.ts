// Typed IPC client: React talks to the Rust backend through these invoke/listen wrappers.

import { getName, getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

export type TimerMode = 'timer' | 'stopwatch'

export interface TimerSnapshot {
  status: TimerStatus
  mode: TimerMode
  remainingSecs: number
  elapsedSecs: number
  durationSecs: number
  formatted: string
}

export type Presets = [number | null, number | null, number | null]

export interface Settings {
  hideWindowOnStart: boolean
  pauseOnSleep: boolean
  startAtLogin: boolean
  notificationsEnabled: boolean
  iconOnly: boolean
  completionSound: string
  autoCheckForUpdates: boolean
  presets: Presets
}

/** Sentinel for disabling the completion sound (first option in the select). */
export const NO_COMPLETION_SOUND = 'None'

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking'; manual: boolean }
  | { kind: 'upToDate'; manual: boolean }
  | { kind: 'available'; version: string; notes?: string | null }
  | { kind: 'downloading'; downloaded: number; total?: number | null }
  | { kind: 'installing' }
  | { kind: 'readyToRestart'; version: string }
  | { kind: 'error'; message: string; manual: boolean }
  | { kind: 'cancelled' }

export const api = {
  getSnapshot: () => invoke<TimerSnapshot>('get_snapshot'),
  getSettings: () => invoke<Settings>('get_settings'),
  updateSettings: (settings: Settings) =>
    invoke<Settings>('update_settings', { settings }),
  setMode: (mode: TimerMode) => invoke<TimerSnapshot>('set_mode', { mode }),
  setDuration: (durationSecs: number) =>
    invoke<TimerSnapshot>('set_duration', { durationSecs }),
  start: () => invoke<TimerSnapshot>('start'),
  pause: () => invoke<TimerSnapshot>('pause'),
  resume: () => invoke<TimerSnapshot>('resume'),
  togglePause: () => invoke<TimerSnapshot>('toggle_pause'),
  reset: () => invoke<TimerSnapshot>('reset'),
  showTimerWindow: () => invoke<void>('show_timer_window'),
  hideTimerWindow: () => invoke<void>('hide_timer_window'),
  openSettings: () => invoke<void>('open_settings'),
  getCompletionSounds: () => invoke<string[]>('get_completion_sounds'),
  previewSound: (name: string) => invoke<void>('preview_sound', { name }),
  quitApp: () => invoke<void>('quit_app'),
  checkForUpdates: () => invoke<UpdateStatus>('check_for_updates'),
  getUpdateStatus: () => invoke<UpdateStatus>('get_update_status'),
  installAvailableUpdate: () => invoke<UpdateStatus>('install_available_update'),
  dismissAvailableUpdate: () => invoke<void>('dismiss_available_update'),
  getAppName: () => getName(),
  getAppVersion: () => getVersion(),
}

export function onTimerTick(
  handler: (snapshot: TimerSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<TimerSnapshot>('timer-tick', (event) => handler(event.payload))
}

export function onTimerCompleted(
  handler: (snapshot: TimerSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<TimerSnapshot>('timer-completed', (event) =>
    handler(event.payload),
  )
}

export function onSettingsChanged(
  handler: (settings: Settings) => void,
): Promise<UnlistenFn> {
  return listen<Settings>('settings-changed', (event) => handler(event.payload))
}

export function onUpdateStatus(
  handler: (status: UpdateStatus) => void,
): Promise<UnlistenFn> {
  return listen<UpdateStatus>('update-status', (event) =>
    handler(event.payload),
  )
}
