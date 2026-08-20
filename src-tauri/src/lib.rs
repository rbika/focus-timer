mod app_state;
mod commands;
mod persistence;
mod sleep;
mod sound;
mod timer;
mod tray;
mod updater;

use std::path::PathBuf;
use std::time::SystemTime;

use tauri::{Emitter, Manager};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

use app_state::AppState;
use persistence::Persistence;
use sleep::SleepDetector;
use timer::TimerStatus;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_snapshot,
            commands::get_settings,
            commands::update_settings,
            commands::set_duration,
            commands::start,
            commands::pause,
            commands::resume,
            commands::toggle_pause,
            commands::reset,
            commands::toggle_icon_only,
            commands::show_timer_window,
            commands::hide_timer_window,
            commands::toggle_timer_window,
            commands::open_settings,
            commands::get_system_sounds,
            commands::preview_sound,
            commands::quit_app,
            commands::check_for_updates,
            commands::get_update_status,
            commands::get_pending_release_notes,
            commands::acknowledge_release_notes,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from(".").join("focus-timer-data"));
            let persistence = Persistence::new(data_dir);
            let (settings, engine, main_window_position, updater_meta) = persistence.load();
            let state = AppState::new(
                persistence,
                settings,
                engine,
                main_window_position,
                updater_meta,
            );
            // Ensure a state file exists immediately for crash recovery.
            let _ = state.persist();
            app.manage(state);

            sync_autostart(app.handle());
            tray::create_tray(app.handle())?;
            tray::position_main_window(app.handle());
            start_tick_loop(app.handle().clone());
            updater::start_background_checks(app.handle().clone());
            updater::show_release_notes_if_needed(app.handle());

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    if window.label() == "main" {
                        tray::save_main_window_position(window.app_handle());
                    }
                    let _ = window.hide();
                }
                tauri::WindowEvent::Focused(false) if window.label() == "main" => {
                    let app = window.app_handle();
                    if !tray::any_sibling_window_visible(app) {
                        tray::hide_main_window(app);
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Focus Timer");
}

fn sync_autostart(app: &tauri::AppHandle) {
    let enabled = app
        .state::<AppState>()
        .settings
        .lock()
        .expect("settings")
        .start_at_login;
    let autostart = app.autolaunch();
    if enabled {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }
}

fn start_tick_loop(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut detector = {
            let remaining = app.state::<AppState>().snapshot().remaining_secs;
            SleepDetector::new(remaining)
        };

        loop {
            let sleep_for = {
                let state = app.state::<AppState>();
                let engine = state.engine.lock().expect("engine");
                engine.time_until_display_tick(SystemTime::now())
            };
            std::thread::sleep(sleep_for);

            let state = app.state::<AppState>();

            if let Some(remaining_before_sleep) = detector.poll_sleep() {
                let pause_on_sleep = state.settings.lock().expect("settings").pause_on_sleep;
                let mut engine = state.engine.lock().expect("engine");
                if pause_on_sleep && engine.status() == TimerStatus::Running {
                    engine.restore_paused(remaining_before_sleep);
                    drop(engine);
                    let _ = state.persist();
                    let snapshot = state.snapshot();
                    tray::update_tray_title(&app, &snapshot.formatted);
                    tray::refresh_tray_menu(&app);
                    tray::emit_tick_if_visible(&app, &snapshot);
                    detector.note_remaining(snapshot.remaining_secs);
                    continue;
                }
            }

            let completed = {
                let mut engine = state.engine.lock().expect("engine");
                engine.tick(SystemTime::now())
            };

            let snapshot = state.snapshot();
            detector.note_remaining(snapshot.remaining_secs);

            tray::update_tray_title(&app, &snapshot.formatted);
            tray::emit_tick_if_visible(&app, &snapshot);

            if completed {
                let (sound_enabled, completion_sound) = {
                    let settings = state.settings.lock().expect("settings");
                    (settings.sound_enabled, settings.completion_sound.clone())
                };
                if sound_enabled {
                    sound::play_named_sound(&completion_sound);
                }
                let _ = state.persist();
                tray::refresh_tray_menu(&app);
                let _ = app.emit("timer-completed", &snapshot);
                let _ = app.emit("timer-tick", &snapshot);
            } else if snapshot.status == TimerStatus::Running {
                let mut ticks = state.ticks_since_persist.lock().expect("ticks");
                *ticks += 1;
                if *ticks >= 5 {
                    *ticks = 0;
                    drop(ticks);
                    let _ = state.persist();
                }
            }
        }
    });
}
