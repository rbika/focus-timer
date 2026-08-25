use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Show a native macOS notification when a focus session ends.
pub fn show_timer_finished(app: &AppHandle) {
    let _ = app
        .notification()
        .builder()
        .title("Focus Timer")
        .body("Your focus session has finished.")
        .show();
}
