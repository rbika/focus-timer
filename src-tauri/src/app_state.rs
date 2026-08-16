use std::sync::Mutex;
use std::time::SystemTime;

use crate::persistence::{Persistence, Settings, WindowPosition};
use crate::timer::{TimerEngine, TimerSnapshot};

pub struct AppState {
    pub engine: Mutex<TimerEngine>,
    pub settings: Mutex<Settings>,
    pub persistence: Persistence,
    pub main_window_position: Mutex<Option<WindowPosition>>,
    pub last_tray_title: Mutex<String>,
    pub ticks_since_persist: Mutex<u32>,
}

impl AppState {
    pub fn new(
        persistence: Persistence,
        settings: Settings,
        engine: TimerEngine,
        main_window_position: Option<WindowPosition>,
    ) -> Self {
        let formatted = TimerSnapshot::from_engine(&engine, SystemTime::now()).formatted;
        let title = if settings.icon_only {
            String::new()
        } else {
            crate::tray::tray_title(&formatted).to_string()
        };
        Self {
            engine: Mutex::new(engine),
            settings: Mutex::new(settings),
            persistence,
            main_window_position: Mutex::new(main_window_position),
            last_tray_title: Mutex::new(title),
            ticks_since_persist: Mutex::new(0),
        }
    }

    pub fn snapshot(&self) -> TimerSnapshot {
        let engine = self.engine.lock().expect("engine lock");
        TimerSnapshot::from_engine(&engine, SystemTime::now())
    }

    pub fn persist(&self) -> Result<(), String> {
        let settings = self.settings.lock().expect("settings lock");
        let engine = self.engine.lock().expect("engine lock");
        let main_window_position = *self
            .main_window_position
            .lock()
            .expect("main window position lock");
        self.persistence
            .save(&settings, &engine, main_window_position)
    }
}
