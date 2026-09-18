# Focus Timer

A macOS menu bar timer. Running time is recorded as focused time the user can review in Stats.

**Entry**:
One contiguous stretch of running time, bounded by a start and an end. It is first recorded from a Start or Resume until Pause, Cancel, or natural completion. Accidental taps of 10 seconds or less are not recorded. After recording, start and end can be corrected (any duration is allowed as long as end is after start); mode cannot. An Entry can be deleted. Resuming always begins a new Entry.

_Avoid: session, log. "Interval" is the engine's in-flight stretch, not a persisted Entry. Do not treat the 10-second skip as an invariant of a persisted Entry._

**Focused time**:
The sum of Entry durations, regardless of mode (Timer or Stopwatch).

**Calendar day**:
The local-timezone midnight-to-midnight date an Entry belongs to, taken from its start time. Dashboard totals and the Entries list both use this.

_Avoid: grouping by end time; splitting an Entry across midnight._
