# ADR-0001: Rust hands keyboard focus to the webview on every show

## Status

Accepted

## Context

Every window in `tauri.conf.json` is declared `"visible": false` — this is a menu
bar app, so windows are created up front and revealed from the tray on demand.

tao only calls `makeKeyAndOrderFront:` at window creation when the window starts
visible. A window born hidden therefore never gets a first responder assigned.
When it is later revealed with `show()` + `set_focus()`, the NSWindow becomes key
and the app activates, but the `WKWebView` is still not the first responder, so
key events reach the window and stop there. Every shortcut implemented as a DOM
`keydown` listener (⌘1, ⌘2, Space) is dead.

The symptom looked intermittent because an NSWindow remembers its first responder
across `orderOut:`/`orderFront:`. Clicking anywhere in the window makes the
webview first responder once, and it stays that way for the window's lifetime —
so only the first reveal after launch was broken.

⌘Q appeared to work throughout, which misdirects: that is Tauri's default macOS
app menu answering `performKeyEquivalent:` at the `NSApp.mainMenu` level, which
needs no first responder at all.

## Decision

`window::focus_webview` calls `makeFirstResponder:` with the `WKWebView`, and
every site that reveals a hidden window calls it right after `show()` +
`set_focus()`.

Keyboard shortcuts stay as DOM listeners in React. Moving them to a native
`NSMenu` with key equivalents would also fix this (key equivalents bypass the
responder chain), but it would move UI-routing decisions into Rust for no gain
beyond the bug, and a menu bar app shows no menu bar for the user to discover
them in.

## Consequences

- Any new window must call `window::focus_webview` after being shown, or its
  keyboard handling will be dead on first reveal. There is no global hook for
  this; the reveal sites are the contract.
- Shortcuts remain testable from the React side and stay colocated with the
  views that own them.
- ⌘Q continues to be served by Tauri's default app menu rather than the app's
  own `quit_app` command. That is a separate concern, not settled here.
