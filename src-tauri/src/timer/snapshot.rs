use serde::{Deserialize, Serialize};

use super::{format_hms, TimerEngine, TimerStatus};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub status: TimerStatus,
    pub remaining_secs: u64,
    pub duration_secs: u64,
    pub formatted: String,
}

impl TimerSnapshot {
    pub fn from_engine(engine: &TimerEngine, now: std::time::SystemTime) -> Self {
        let remaining_secs = engine.remaining_secs(now);
        Self {
            status: engine.status(),
            remaining_secs,
            duration_secs: engine.duration_secs(),
            formatted: format_hms(remaining_secs),
        }
    }
}
