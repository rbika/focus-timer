use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::app_state::AppState;

pub const AUTO_CHECK_INTERVAL_SECS: u64 = 24 * 60 * 60;
const STATUS_EVENT: &str = "update-status";
const NOTES_PREVIEW_CHARS: usize = 400;
const UPDATE_AVAILABLE_WINDOW: &str = "update-available";
const UPDATE_PROGRESS_WINDOW: &str = "update-progress";

#[derive(Debug, Clone)]
pub struct PendingUpdate {
    pub version: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum UpdateStatus {
    Idle,
    Checking {
        manual: bool,
    },
    UpToDate {
        manual: bool,
    },
    Available {
        version: String,
        notes: Option<String>,
    },
    Downloading {
        downloaded: u64,
        total: Option<u64>,
    },
    Installing,
    ReadyToRestart {
        version: String,
    },
    Error {
        message: String,
        manual: bool,
    },
    Cancelled,
}

pub fn start_background_checks(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(3));
        loop {
            let should_check = {
                let state = app.state::<AppState>();
                let enabled = state
                    .settings
                    .lock()
                    .expect("settings lock")
                    .auto_check_for_updates;
                if !enabled {
                    false
                } else {
                    let meta = state.updater_meta.lock().expect("updater meta lock");
                    should_auto_check(meta.last_auto_check_unix, unix_now())
                }
            };

            if should_check {
                let app_handle = app.clone();
                let _ = tauri::async_runtime::block_on(run_check(app_handle, false));
            }

            std::thread::sleep(Duration::from_secs(60 * 30));
        }
    });
}

pub fn should_auto_check(last_auto_check_unix: Option<u64>, now_unix: u64) -> bool {
    match last_auto_check_unix {
        None => true,
        Some(last) => now_unix.saturating_sub(last) >= AUTO_CHECK_INTERVAL_SECS,
    }
}

pub async fn run_check(app: AppHandle, manual: bool) -> Result<UpdateStatus, String> {
    let state = app.state::<AppState>();
    if state
        .update_in_flight
        .compare_exchange(
            false,
            true,
            std::sync::atomic::Ordering::SeqCst,
            std::sync::atomic::Ordering::SeqCst,
        )
        .is_err()
    {
        return Ok(current_status(&app));
    }

    let result = run_check_inner(app.clone(), manual).await;
    state
        .update_in_flight
        .store(false, std::sync::atomic::Ordering::SeqCst);
    result
}

async fn run_check_inner(app: AppHandle, manual: bool) -> Result<UpdateStatus, String> {
    set_status(&app, UpdateStatus::Checking { manual });

    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(err) => {
            return finish_error(&app, err.to_string(), manual);
        }
    };

    let update = match updater.check().await {
        Ok(update) => update,
        Err(err) => {
            return finish_error(&app, err.to_string(), manual);
        }
    };

    if !manual {
        mark_auto_check(&app);
    }

    let Some(update) = update else {
        let status = UpdateStatus::UpToDate { manual };
        set_status(&app, status.clone());
        if manual {
            show_up_to_date_window(&app);
        }
        return Ok(status);
    };

    let version = update.version.clone();
    let notes = update.body.clone();
    let status = UpdateStatus::Available {
        version: version.clone(),
        notes: notes.clone(),
    };
    set_status(&app, status.clone());
    show_update_available_window(&app);
    Ok(status)
}

pub async fn install_available_update(app: AppHandle) -> Result<UpdateStatus, String> {
    let state = app.state::<AppState>();
    if state
        .update_in_flight
        .compare_exchange(
            false,
            true,
            std::sync::atomic::Ordering::SeqCst,
            std::sync::atomic::Ordering::SeqCst,
        )
        .is_err()
    {
        return Ok(current_status(&app));
    }

    let expected_version = match current_status(&app) {
        UpdateStatus::Available { version, notes } => {
            {
                let state = app.state::<AppState>();
                *state
                    .pending_update
                    .lock()
                    .expect("pending update lock") = Some(PendingUpdate {
                    version: version.clone(),
                    notes: notes.clone(),
                });
            }
            version
        }
        other => {
            state
                .update_in_flight
                .store(false, std::sync::atomic::Ordering::SeqCst);
            return Ok(other);
        }
    };

    let result = install_available_update_inner(app.clone(), expected_version).await;
    state
        .update_in_flight
        .store(false, std::sync::atomic::Ordering::SeqCst);
    result
}

async fn install_available_update_inner(
    app: AppHandle,
    expected_version: String,
) -> Result<UpdateStatus, String> {
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(err) => return finish_error(&app, err.to_string(), true),
    };
    let update = match updater.check().await {
        Ok(Some(fresh)) if fresh.version == expected_version => fresh,
        Ok(Some(fresh)) => {
            let status = UpdateStatus::Error {
                message: format!(
                    "Update changed from {expected_version} to {}. Check again.",
                    fresh.version
                ),
                manual: true,
            };
            set_status(&app, status.clone());
            return Ok(status);
        }
        Ok(None) => {
            hide_update_available_window(&app);
            let status = UpdateStatus::UpToDate { manual: true };
            set_status(&app, status.clone());
            show_up_to_date_window(&app);
            return Ok(status);
        }
        Err(err) => return finish_error(&app, err.to_string(), true),
    };

    let installed_version = update.version.clone();

    hide_update_available_window(&app);
    show_update_progress_window(&app);
    set_status(
        &app,
        UpdateStatus::Downloading {
            downloaded: 0,
            total: None,
        },
    );

    let mut downloaded: u64 = 0;
    let mut total: Option<u64> = None;
    let download_result = update
        .download_and_install(
            |chunk_len, content_len| {
                downloaded = downloaded.saturating_add(chunk_len as u64);
                if content_len.is_some() {
                    total = content_len;
                }
                set_status(&app, UpdateStatus::Downloading { downloaded, total });
            },
            || {
                set_status(&app, UpdateStatus::Installing);
            },
        )
        .await;

    if let Err(err) = download_result {
        hide_update_progress_window(&app);
        show_update_available_window(&app);
        return finish_error(&app, err.to_string(), true);
    }

    let status = UpdateStatus::ReadyToRestart {
        version: installed_version.clone(),
    };
    set_status(&app, status.clone());
    show_update_progress_window(&app);

    Ok(status)
}

pub fn cancel_update_download(app: &AppHandle) {
    restore_available_update(app);
    hide_update_progress_window(app);
    show_update_available_window(app);
}

pub fn dismiss_update_progress(app: &AppHandle) {
    let status = current_status(app);
    hide_update_progress_window(app);
    if matches!(status, UpdateStatus::Error { .. }) {
        restore_available_update(app);
        show_update_available_window(app);
    }
}

pub fn restart_for_update(app: &AppHandle) {
    app.restart();
}

pub fn dismiss_available_update(app: &AppHandle) {
    hide_update_available_window(app);
    set_status(app, UpdateStatus::Cancelled);
}

pub fn current_status(app: &AppHandle) -> UpdateStatus {
    app.state::<AppState>()
        .update_status
        .lock()
        .expect("update status lock")
        .clone()
}

fn finish_error(app: &AppHandle, message: String, manual: bool) -> Result<UpdateStatus, String> {
    let status = UpdateStatus::Error {
        message: message.clone(),
        manual,
    };
    set_status(app, status.clone());
    if manual {
        hide_update_progress_window(app);
        show_update_available_window(app);
        Err(message)
    } else {
        Ok(status)
    }
}

fn mark_auto_check(app: &AppHandle) {
    {
        let state = app.state::<AppState>();
        let mut meta = state.updater_meta.lock().expect("updater meta lock");
        meta.last_auto_check_unix = Some(unix_now());
    }
    let _ = app.state::<AppState>().persist();
}

fn set_status(app: &AppHandle, status: UpdateStatus) {
    {
        let state = app.state::<AppState>();
        *state.update_status.lock().expect("update status lock") = status.clone();
    }
    let _ = app.emit(STATUS_EVENT, &status);
}

fn show_up_to_date_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("up-to-date") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn show_update_available_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(UPDATE_AVAILABLE_WINDOW) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_update_available_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(UPDATE_AVAILABLE_WINDOW) {
        let _ = window.hide();
    }
}

fn show_update_progress_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(UPDATE_PROGRESS_WINDOW) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_update_progress_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(UPDATE_PROGRESS_WINDOW) {
        let _ = window.hide();
    }
}

fn restore_available_update(app: &AppHandle) {
    let pending = app
        .state::<AppState>()
        .pending_update
        .lock()
        .expect("pending update lock")
        .clone();
    if let Some(pending) = pending {
        set_status(
            app,
            UpdateStatus::Available {
                version: pending.version,
                notes: pending.notes,
            },
        );
    }
}

#[allow(dead_code)]
fn notes_preview(notes: Option<&str>) -> String {
    let Some(notes) = notes.map(str::trim).filter(|s| !s.is_empty()) else {
        return "No release notes provided.".to_string();
    };
    if notes.chars().count() <= NOTES_PREVIEW_CHARS {
        return notes.to_string();
    }
    let truncated: String = notes.chars().take(NOTES_PREVIEW_CHARS).collect();
    format!("{truncated}…")
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_check_when_never_checked() {
        assert!(should_auto_check(None, 100));
    }

    #[test]
    fn auto_check_respects_throttle() {
        let last = 1_000;
        assert!(!should_auto_check(Some(last), last + 60));
        assert!(!should_auto_check(
            Some(last),
            last + AUTO_CHECK_INTERVAL_SECS - 1
        ));
        assert!(should_auto_check(
            Some(last),
            last + AUTO_CHECK_INTERVAL_SECS
        ));
    }

    #[test]
    fn notes_preview_truncates() {
        let long = "a".repeat(NOTES_PREVIEW_CHARS + 10);
        let preview = notes_preview(Some(&long));
        assert!(preview.ends_with('…'));
        assert_eq!(preview.chars().count(), NOTES_PREVIEW_CHARS + 1);
    }
}
