# ADR-0002: React-side overlay for active interval in Stats

## Status

Accepted

## Context

Stats (Dashboard totals and Entries list) should reflect the currently running
Interval so the user sees live focused-time numbers while the timer or stopwatch
is active. The active interval is ephemeral — it has not been persisted as an
Entry yet.

Two approaches were considered:

1. **Rust-side inclusion** — modify `get_totals` and `get_entries` to mix the
   in-flight interval data into their responses. The backend would need to
   recompute on every tick and the commands would return a hybrid of persisted
   and ephemeral data.

2. **React-side overlay** — keep the Rust APIs returning only persisted data.
   The React hooks that feed Dashboard and Entries subscribe to the
   `TimerSnapshot` already in the zustand store, and when `status === running`,
   inject a synthetic entry into the list and add `intervalElapsedSecs` to the
   relevant totals.

## Decision

React-side overlay (option 2).

The `TimerSnapshot` is already pushed to the frontend every second via the
`timer-tick` event and stored in zustand. The overlay adds no new IPC, no new
Rust commands, and no coupling between the persistence layer and the display
layer. The synthetic entry is a UI-only construct — it is never written to
`entries.json`, never has an `id`, and vanishes the moment the engine leaves
`running`.

## Consequences

- Rust's `get_totals` and `get_entries` remain pure functions over persisted
  data. Tests for totals and entry ordering stay unchanged.
- React hooks (`useTotals`, `useEntries`, or wrappers around them) gain a
  dependency on the timer store. They must re-render each second while the
  engine is running — scoped to whichever Stats tab is currently visible to
  avoid unnecessary work.
- The synthetic entry needs a stable identity (e.g. a sentinel `id` like
  `"__active__"`) so React's keyed list doesn't remount it every tick.
- A brief overlap is possible when the interval ends: the synthetic entry
  disappears (snapshot leaves `running`) and the persisted entry arrives via
  `entry-recorded` refetch. This is accepted as negligible latency.
