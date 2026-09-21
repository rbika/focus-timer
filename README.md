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
cp .env.example .env
npm run tauri dev
```

Debug builds load `.env` / `.env.local` from the project root. `ALWAYS_ON_TOP=true` keeps the timer panel visible while you work; set it to `false` for normal hide-on-blur. Release builds ignore these files and never pin.

## Architecture

- **Rust** owns the timer engine, persistence, tray, sleep detection, completion sound, and updater flow.
- **React** renders the timer panel and settings window only — no countdown polling.
