# Timer App

A macOS menu bar timer application using Tauri v2, React, TypeScript, and Rust.

The application should prioritize:

- native behavior
- minimal CPU usage
- low memory consumption
- simplicity
- excellent UX
- Apple's Human Interface Guidelines

# Guiding Principles

- Rust owns business logic.
- React renders UI.
- Never duplicate timer logic.
- Prefer native APIs over web implementations.
- Follow macOS conventions instead of cross-platform conventions.

# Architecture

Rust

- timer engine
- persistence
- tray
- menu
- startup
- sleep handling
- sound playback

React

- window
- settings
- state display

# Code Quality

- Small components.
- Small Rust modules.
- Strict TypeScript.
- Strong typing.
- Feature-first organization.
- Prefer composition over inheritance.
