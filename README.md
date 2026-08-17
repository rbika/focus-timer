# Focus Timer

macOS menu bar countdown timer.

Requires **macOS 26 (Tahoe)** or newer.

![Screenshot of Focus Timer](./screenshots/focus-timer.png)

## Features

- Live countdown and controls in the menu bar
- Configurable completion sounds
- Automatic pause when your Mac sleeps
- Persistent timer when app is closed

## Installation instructions

1. Download the latest `.dmg` file from [Github Releases page](https://github.com/rbika/focus-timer/releases).
2. Open and move the app into Applications folder.
3. Run the following command in the terminal to remove quarantine flag:
   ```shell
   xattr -cr /Applications/Focus\ Timer.app
   ```

## Develop

```bash
npm install
npm run tauri dev
```

## Test

```bash
cd src-tauri && cargo test
npm run typecheck
```

## Architecture

- **Rust** owns the timer engine, persistence, tray, sleep detection, completion sound, and updater flow.
- **React** renders the timer panel, settings window, and release notes window only — no countdown polling.
