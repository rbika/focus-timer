use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindow};

/// Dev-only pin for the main window.
///
/// - Release builds always return `false` (shipping apps never pin).
/// - Debug builds honor `ALWAYS_ON_TOP` from the process env / `.env` files.
pub fn always_on_top_enabled() -> bool {
    if !cfg!(debug_assertions) {
        return false;
    }
    match std::env::var("ALWAYS_ON_TOP") {
        Ok(value) => matches!(
            value.to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        ),
        Err(_) => false,
    }
}

pub fn apply_dev_always_on_top(window: &WebviewWindow) {
    if always_on_top_enabled() {
        let _ = window.set_always_on_top(true);
    }
}

/// Which content the main window is currently showing — drives the
/// animated resize between the compact Timer footprint and the larger
/// Stats view.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MainView {
    Timer,
    Stats,
}

const TIMER_SIZE: (f64, f64) = (290.0, 230.0);
const STATS_SIZE: (f64, f64) = (290.0, 320.0);
const RESIZE_DURATION: f64 = 0.2;

#[tauri::command]
pub fn resize_main_window(app: AppHandle, view: MainView) -> Result<(), String> {
    let (width, height) = match view {
        MainView::Timer => TIMER_SIZE,
        MainView::Stats => STATS_SIZE,
    };
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    animate_main_window_resize(&window, width, height);
    Ok(())
}

/// Resizes the window natively, keeping its top-left corner fixed on
/// screen (it grows/shrinks down and to the right), using the same
/// `NSAnimationContext` grouping + `.animator()` pattern `tray.rs` uses
/// for the tray icon fade.
#[cfg(target_os = "macos")]
fn animate_main_window_resize(window: &tauri::WebviewWindow, width: f64, height: f64) {
    use objc2_app_kit::{NSAnimatablePropertyContainer, NSAnimationContext, NSWindow};
    use objc2_foundation::{NSPoint, NSRect, NSSize};

    let Ok(ns_window_ptr) = window.ns_window() else {
        return;
    };
    if objc2::MainThreadMarker::new().is_none() {
        return;
    }
    let ns_window: &NSWindow = unsafe { &*(ns_window_ptr as *mut NSWindow) };

    let current = ns_window.frame();
    let new_frame = NSRect::new(
        NSPoint::new(current.origin.x, current.origin.y + current.size.height - height),
        NSSize::new(width, height),
    );

    NSAnimationContext::beginGrouping();
    NSAnimationContext::currentContext().setDuration(RESIZE_DURATION);
    ns_window.animator().setFrame_display(new_frame, true);
    NSAnimationContext::endGrouping();
}

#[cfg(not(target_os = "macos"))]
fn animate_main_window_resize(window: &tauri::WebviewWindow, width: f64, height: f64) {
    let _ = window.set_size(tauri::LogicalSize::new(width, height));
}
