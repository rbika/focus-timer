/// Sentinel value for "no completion sound" (shown as "None" in settings).
pub const NO_COMPLETION_SOUND: &str = "None";

/// Built-in macOS system sound names (`/System/Library/Sounds/*.aiff`),
/// as listed in System Settings > Sound > Sound Effects.
pub const SYSTEM_SOUNDS: &[&str] = &[
    "Basso",
    "Blow",
    "Bottle",
    "Frog",
    "Funk",
    "Glass",
    "Hero",
    "Morse",
    "Ping",
    "Pop",
    "Purr",
    "Sosumi",
    "Submarine",
    "Tink",
];

pub fn is_completion_sound_enabled(name: &str) -> bool {
    !name.is_empty() && name != NO_COMPLETION_SOUND
}

/// Play a native macOS system sound by name via `NSSound`.
#[cfg(target_os = "macos")]
pub fn play_named_sound(name: &str) {
    if !is_completion_sound_enabled(name) {
        return;
    }

    use objc2_app_kit::NSSound;
    use objc2_foundation::NSString;

    let name = NSString::from_str(name);
    if let Some(sound) = NSSound::soundNamed(&name) {
        let _ = sound.play();
    }
}

#[cfg(not(target_os = "macos"))]
pub fn play_named_sound(_name: &str) {}
