# Focus Timer

macOS menu bar countdown timer.

Requires **macOS 26 (Tahoe)** or newer.

![Screenshot of Focus Timer](./screenshots/focus-timer.png)

## Features

- Live menu bar timer.
- Light and dark mode support.
- Timer state preserved across app restarts.
- Automatic pausing when your Mac sleeps.

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

## Architecture

- **Rust** owns the timer engine, persistence, tray, sleep detection, completion sound, and updater flow.
- **React** renders the timer panel and settings window only — no countdown polling.
