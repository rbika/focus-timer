use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::timer::{TimerEngine, TimerStatus};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub hide_window_on_start: bool,
    pub pause_on_sleep: bool,
    pub start_at_login: bool,
    pub sound_enabled: bool,
    #[serde(default)]
    pub icon_only: bool,
    #[serde(default = "default_completion_sound")]
    pub completion_sound: String,
}

fn default_completion_sound() -> String {
    "Glass".to_string()
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hide_window_on_start: true,
            pause_on_sleep: true,
            start_at_login: false,
            sound_enabled: true,
            icon_only: false,
            completion_sound: default_completion_sound(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedTimer {
    status: TimerStatus,
    duration_secs: u64,
    remaining_at_pause: u64,
    /// Unix timestamp seconds when running.
    deadline_unix: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    settings: Settings,
    timer: PersistedTimer,
    #[serde(default)]
    main_window_position: Option<WindowPosition>,
}

pub struct Persistence {
    path: PathBuf,
}

impl Persistence {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            path: app_data_dir.join("state.json"),
        }
    }

    pub fn load(&self) -> (Settings, TimerEngine, Option<WindowPosition>) {
        let Ok(bytes) = fs::read(&self.path) else {
            return (Settings::default(), TimerEngine::default(), None);
        };
        let Ok(state) = serde_json::from_slice::<PersistedState>(&bytes) else {
            return (Settings::default(), TimerEngine::default(), None);
        };

        let duration = state.timer.duration_secs.max(1);
        let mut engine = TimerEngine::new(duration);
        let now = SystemTime::now();

        match state.timer.status {
            TimerStatus::Running => {
                if let Some(deadline_unix) = state.timer.deadline_unix {
                    let deadline = UNIX_EPOCH + Duration::from_secs(deadline_unix);
                    engine.restore_running(deadline, now);
                } else {
                    engine.reset();
                }
            }
            TimerStatus::Paused => {
                engine.restore_paused(state.timer.remaining_at_pause);
            }
            TimerStatus::Completed => {
                engine.restore_completed();
            }
            TimerStatus::Idle => {
                engine.reset();
            }
        }

        (state.settings, engine, state.main_window_position)
    }

    pub fn save(
        &self,
        settings: &Settings,
        engine: &TimerEngine,
        main_window_position: Option<WindowPosition>,
    ) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let deadline_unix = engine.deadline().and_then(|deadline| {
            deadline
                .duration_since(UNIX_EPOCH)
                .ok()
                .map(|d| d.as_secs())
        });

        let state = PersistedState {
            settings: settings.clone(),
            timer: PersistedTimer {
                status: engine.status(),
                duration_secs: engine.duration_secs(),
                remaining_at_pause: engine.remaining_secs(SystemTime::now()),
                deadline_unix,
            },
            main_window_position,
        };

        let json = serde_json::to_vec_pretty(&state).map_err(|e| e.to_string())?;
        let tmp = self.path.with_extension("json.tmp");
        {
            let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
            file.write_all(&json).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
        }
        fs::rename(&tmp, &self.path).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::timer::TimerStatus;
    use std::time::Duration;

    #[test]
    fn settings_default_values() {
        let s = Settings::default();
        assert!(s.hide_window_on_start);
        assert!(s.pause_on_sleep);
        assert!(!s.start_at_login);
        assert!(s.sound_enabled);
        assert!(!s.icon_only);
        assert_eq!(s.completion_sound, "Glass");
    }

    #[test]
    fn roundtrip_paused_state() {
        let dir = std::env::temp_dir().join(format!(
            "focus-timer-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        let persistence = Persistence::new(dir.clone());

        let settings = Settings::default();
        let mut engine = TimerEngine::new(120);
        let now = SystemTime::UNIX_EPOCH + Duration::from_secs(2_000_000_000);
        engine.start(now);
        engine.pause(now + Duration::from_secs(20));
        let position = WindowPosition { x: 420, y: 32 };
        persistence
            .save(&settings, &engine, Some(position))
            .unwrap();

        let (loaded_settings, loaded_engine, loaded_position) = persistence.load();
        assert_eq!(loaded_settings, settings);
        assert_eq!(loaded_engine.status(), TimerStatus::Paused);
        assert_eq!(loaded_engine.remaining_secs(SystemTime::now()), 100);
        assert_eq!(loaded_position, Some(position));

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn settings_serialization_uses_camel_case() {
        let json = serde_json::to_string(&Settings::default()).unwrap();
        assert!(json.contains("hideWindowOnStart"));
        assert!(json.contains("pauseOnSleep"));
        assert!(json.contains("startAtLogin"));
        assert!(json.contains("soundEnabled"));
        assert!(json.contains("iconOnly"));
        assert!(json.contains("completionSound"));
        let parsed: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, Settings::default());
    }
}
