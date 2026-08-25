use std::time::SystemTime;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

use crate::app_state::AppState;
use crate::persistence::Settings;
use crate::timer::{TimerSnapshot, TimerStatus};

#[tauri::command]
pub fn get_snapshot(app: AppHandle) -> TimerSnapshot {
    app.state::<AppState>().snapshot()
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Settings {
    app.state::<AppState>()
        .settings
        .lock()
        .expect("settings lock")
        .clone()
}

#[tauri::command]
pub fn update_settings(app: AppHandle, settings: Settings) -> Result<Settings, String> {
    let state = app.state::<AppState>();

    {
        let mut current = state.settings.lock().expect("settings lock");
        *current = Settings {
            hide_window_on_start: settings.hide_window_on_start,
            pause_on_sleep: settings.pause_on_sleep,
            start_at_login: settings.start_at_login,
            notifications_enabled: settings.notifications_enabled,
            sound_enabled: settings.sound_enabled,
            icon_only: settings.icon_only,
            completion_sound: settings.completion_sound,
            auto_check_for_updates: settings.auto_check_for_updates,
        };
    }

    // Autostart
    let autostart = app.autolaunch();
    if settings.start_at_login {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }

    state.persist()?;
    let saved = state.settings.lock().expect("settings lock").clone();
    let _ = app.emit("settings-changed", &saved);

    let snapshot = state.snapshot();
    crate::tray::update_tray_title(&app, &snapshot.formatted);
    crate::tray::refresh_tray_menu(&app);
    crate::tray::emit_tick_if_visible(&app, &snapshot);

    Ok(saved)
}

#[tauri::command]
pub fn set_duration(app: AppHandle, duration_secs: u64) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();

    let (unchanged, prev_duration) = {
        let mut engine = state.engine.lock().expect("engine lock");
        if !matches!(engine.status(), TimerStatus::Idle | TimerStatus::Completed) {
            return Err("Timer must be idle to change duration".into());
        }
        let prev = engine.duration_secs();
        if prev == duration_secs {
            (true, prev)
        } else {
            engine.set_duration(duration_secs);
            (false, prev)
        }
    };

    if unchanged {
        return Ok(state.snapshot());
    }

    state.persist()?;
    let snapshot = state.snapshot();
    crate::tray::update_tray_title(&app, &snapshot.formatted);
    // Start is disabled in the tray at 0s, so rebuild when that flips.
    if (prev_duration == 0) != (duration_secs == 0) {
        crate::tray::refresh_tray_menu(&app);
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn start(app: AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    let hide = state
        .settings
        .lock()
        .expect("settings lock")
        .hide_window_on_start;

    {
        let mut engine = state.engine.lock().expect("engine lock");
        engine.start(SystemTime::now());
    }

    state.persist()?;
    let snapshot = state.snapshot();
    crate::tray::update_tray_title(&app, &snapshot.formatted);
    crate::tray::refresh_tray_menu(&app);
    let _ = app.emit("timer-tick", &snapshot);

    if hide {
        crate::tray::hide_main_window(&app);
    }

    Ok(snapshot)
}

#[tauri::command]
pub fn pause(app: AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    {
        let mut engine = state.engine.lock().expect("engine lock");
        engine.pause(SystemTime::now());
    }
    after_control(&app)
}

#[tauri::command]
pub fn resume(app: AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    {
        let mut engine = state.engine.lock().expect("engine lock");
        engine.resume(SystemTime::now());
    }
    after_control(&app)
}

#[tauri::command]
pub fn toggle_pause(app: AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    let hide = {
        let settings = state.settings.lock().expect("settings lock");
        settings.hide_window_on_start
    };

    let became_running = {
        let mut engine = state.engine.lock().expect("engine lock");
        let before = engine.status();
        engine.toggle_pause(SystemTime::now());
        matches!(
            (before, engine.status()),
            (
                TimerStatus::Idle | TimerStatus::Paused | TimerStatus::Completed,
                TimerStatus::Running
            )
        )
    };

    state.persist()?;
    let snapshot = state.snapshot();
    crate::tray::update_tray_title(&app, &snapshot.formatted);
    crate::tray::refresh_tray_menu(&app);
    let _ = app.emit("timer-tick", &snapshot);

    if became_running && hide {
        crate::tray::hide_main_window(&app);
    }

    Ok(snapshot)
}

#[tauri::command]
pub fn reset(app: AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    {
        let mut engine = state.engine.lock().expect("engine lock");
        engine.reset();
    }
    after_control(&app)
}

#[tauri::command]
pub fn toggle_icon_only(app: AppHandle) -> Result<Settings, String> {
    let state = app.state::<AppState>();
    let updated = {
        let mut settings = state.settings.lock().expect("settings lock");
        settings.icon_only = !settings.icon_only;
        settings.clone()
    };

    state.persist()?;
    let _ = app.emit("settings-changed", &updated);

    let snapshot = state.snapshot();
    crate::tray::update_tray_title(&app, &snapshot.formatted);
    crate::tray::refresh_tray_menu(&app);

    Ok(updated)
}

#[tauri::command]
pub fn show_timer_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        // Push current snapshot when shown
        let snapshot = app.state::<AppState>().snapshot();
        let _ = app.emit("timer-tick", &snapshot);
    }
    Ok(())
}

#[tauri::command]
pub fn hide_timer_window(app: AppHandle) -> Result<(), String> {
    crate::tray::hide_main_window(&app);
    Ok(())
}

#[tauri::command]
pub fn toggle_timer_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        if visible {
            crate::tray::hide_main_window(&app);
        } else {
            show_timer_window(app)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn open_settings(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_system_sounds() -> Vec<&'static str> {
    crate::sound::SYSTEM_SOUNDS.to_vec()
}

#[tauri::command]
pub fn preview_sound(name: String) {
    crate::sound::play_named_sound(&name);
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    crate::tray::save_main_window_position(&app);
    let state = app.state::<AppState>();
    {
        let mut engine = state.engine.lock().expect("engine lock");
        engine.pause(SystemTime::now());
    }
    let _ = state.persist();
    app.exit(0);
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<crate::updater::UpdateStatus, String> {
    crate::updater::run_check(app, true).await
}

#[tauri::command]
pub fn get_update_status(app: AppHandle) -> crate::updater::UpdateStatus {
    crate::updater::current_status(&app)
}

fn after_control(app: &AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    state.persist()?;
    let snapshot = state.snapshot();
    crate::tray::update_tray_title(app, &snapshot.formatted);
    crate::tray::refresh_tray_menu(app);
    let _ = app.emit("timer-tick", &snapshot);
    Ok(snapshot)
}
