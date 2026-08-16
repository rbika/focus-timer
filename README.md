# Focus Timer

macOS menu bar countdown timer built with Tauri v2, React 19, TypeScript, and Rust.

Requires **macOS 26 (Tahoe)** or newer.

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

- **Rust** owns the timer engine, persistence, tray, sleep detection, and completion sound.
- **React** renders the timer panel and settings window only — no countdown polling.
