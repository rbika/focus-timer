# Focus Timer

A macOS menu bar timer. Running time is recorded as focused time the user can review in Stats.

**Entry**:
One contiguous stretch of running time, bounded by a start (Start or Resume) and an end (Pause, Cancel, or natural completion). Resuming always begins a new Entry.

_Avoid: session, log. "Interval" is the engine's in-flight stretch, not a persisted Entry._

**Focused time**:
The sum of Entry durations, regardless of mode (Timer or Stopwatch).

**Calendar day**:
The local-timezone midnight-to-midnight date an Entry belongs to, taken from its start time. Dashboard totals and the Entries list both use this.

_Avoid: grouping by end time; splitting an Entry across midnight._
