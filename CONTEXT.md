# Focus Timer

A macOS menu bar timer. Running time is recorded as focused time the user can review in Stats.

**Entry**:
One contiguous stretch of focused time, bounded by a start and an end. It is either **recorded** from a Start or Resume until Pause, Save of a running Interval, or natural completion, or **created** from Stats as a Manual entry.

Accidental recorded taps of 10 seconds or less are not recorded. A Manual entry is a draft until Save; the 10-second skip does not apply to create or to later corrections. After an Entry exists, start and end can be corrected (any duration is allowed as long as end is after start); type cannot. An Entry can be deleted. Resuming always begins a new Entry.

_Avoid: session, log. "Interval" is the engine's in-flight stretch, not a persisted Entry. Do not treat the 10-second skip as an invariant of a persisted Entry._

**Discard**:
Ending a running Interval without recording an Entry. The engine returns to Idle.

_Avoid: Delete (that removes a persisted Entry). Discard never touches existing Entries._

**Type**:
Timer, Stopwatch, or Manual. Timer and Stopwatch are copied from the engine when an interval is recorded. Manual is only for entries created from Stats, shown with the square-pen icon.

_Avoid: treating Manual as an engine mode. The menu bar is still only Timer or Stopwatch._

**Manual entry**:
An Entry created from Stats rather than from a finished interval. Not persisted until Save. The create editor has no Delete action.

**Focused time**:
The sum of Entry durations, regardless of type (Timer, Stopwatch, or Manual).

**Calendar day**:
The local-timezone midnight-to-midnight date an Entry belongs to, taken from its start time. Dashboard totals and the Entries list both use this.

_Avoid: grouping by end time; splitting an Entry across midnight._
