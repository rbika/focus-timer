use serde::{Deserialize, Serialize};

use super::{format_hms, TimerEngine, TimerMode, TimerStatus};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub status: TimerStatus,
    pub mode: TimerMode,
    pub remaining_secs: u64,
    pub elapsed_secs: u64,
    pub duration_secs: u64,
    pub formatted: String,
}

impl TimerSnapshot {
    pub fn from_engine(engine: &TimerEngine, now: std::time::SystemTime) -> Self {
        let remaining_secs = engine.remaining_secs(now);
        let elapsed_secs = engine.elapsed_secs(now);
        let formatted = match engine.mode() {
            TimerMode::Timer => format_hms(remaining_secs),
            TimerMode::Stopwatch => format_hms(elapsed_secs),
        };
        Self {
            status: engine.status(),
            mode: engine.mode(),
            remaining_secs,
            elapsed_secs,
            duration_secs: engine.duration_secs(),
            formatted,
        }
    }
}
