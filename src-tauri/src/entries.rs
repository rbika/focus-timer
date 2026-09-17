use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::{DateTime, Datelike, Local, TimeZone};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::timer::{FinishedInterval, TimerMode};

/// A contiguous stretch of focused time, bounded by a start (Start or
/// Resume) and an end (Pause, Cancel, or natural completion).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub mode: TimerMode,
    pub started_at_unix: u64,
    pub ended_at_unix: u64,
    pub duration_secs: u64,
}

// `Totals`, `compute_totals`, `to_local`, and `EntriesStore::totals` are not
// yet wired to a Tauri command — that lands with the Dashboard tab.
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Totals {
    pub today: u64,
    pub this_week: u64,
    pub this_month: u64,
}

/// A run of `MIN_ENTRY_DURATION_SECS` or less is an accidental tap (e.g.
/// Start immediately followed by Pause), not a real focus session.
const MIN_ENTRY_DURATION_SECS: u64 = 10;

/// Turns a just-finished engine interval into an Entry ready to persist,
/// or `None` if it's at or under the 10-second minimum.
pub fn entry_from_interval(interval: FinishedInterval) -> Option<Entry> {
    let started_at_unix = interval.started_at.duration_since(UNIX_EPOCH).ok()?.as_secs();
    let ended_at_unix = interval.ended_at.duration_since(UNIX_EPOCH).ok()?.as_secs();
    let duration_secs = ended_at_unix.saturating_sub(started_at_unix);
    if duration_secs <= MIN_ENTRY_DURATION_SECS {
        return None;
    }
    Some(Entry {
        id: Uuid::new_v4().to_string(),
        mode: interval.mode,
        started_at_unix,
        ended_at_unix,
        duration_secs,
    })
}

#[allow(dead_code)]
fn to_local(unix_secs: u64) -> DateTime<Local> {
    Local
        .timestamp_opt(unix_secs as i64, 0)
        .single()
        .unwrap_or_else(Local::now)
}

/// Sums Entry durations into Today/This-Week/This-Month buckets, bucketed
/// by each Entry's start time using local-timezone calendar boundaries
/// (day is midnight-to-midnight, week starts Monday, month is calendar
/// month), for the given instant.
#[allow(dead_code)]
pub fn compute_totals(entries: &[Entry], now: SystemTime) -> Totals {
    let now_unix = now.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let now_local = to_local(now_unix).naive_local();

    let today_start = now_local.date().and_hms_opt(0, 0, 0).unwrap();
    let days_since_monday = now_local.date().weekday().num_days_from_monday();
    let week_start = today_start - chrono::Duration::days(days_since_monday as i64);
    let month_start = now_local
        .date()
        .with_day(1)
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap();

    let mut totals = Totals::default();
    for entry in entries {
        let started_local = to_local(entry.started_at_unix).naive_local();
        if started_local >= today_start {
            totals.today += entry.duration_secs;
        }
        if started_local >= week_start {
            totals.this_week += entry.duration_secs;
        }
        if started_local >= month_start {
            totals.this_month += entry.duration_secs;
        }
    }
    totals
}

pub struct EntriesStore {
    path: PathBuf,
}

impl EntriesStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            path: app_data_dir.join("entries.json"),
        }
    }

    pub fn load_all(&self) -> Vec<Entry> {
        let Ok(bytes) = fs::read(&self.path) else {
            return Vec::new();
        };
        serde_json::from_slice(&bytes).unwrap_or_default()
    }

    pub fn append(&self, entry: Entry) -> Result<(), String> {
        let mut entries = self.load_all();
        entries.push(entry);
        self.write_all(&entries)
    }

    #[allow(dead_code)]
    pub fn totals(&self, now: SystemTime) -> Totals {
        compute_totals(&self.load_all(), now)
    }

    fn write_all(&self, entries: &[Entry]) -> Result<(), String> {
        let json = serde_json::to_vec_pretty(entries).map_err(|e| e.to_string())?;
        crate::atomic_file::write_json(&self.path, &json)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn temp_dir(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "focus-timer-entries-test-{label}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn entry_from_interval_computes_duration_and_a_fresh_id() {
        let started = SystemTime::UNIX_EPOCH + Duration::from_secs(2_000_000_000);
        let interval = FinishedInterval {
            mode: TimerMode::Timer,
            started_at: started,
            ended_at: started + Duration::from_secs(90),
        };
        let entry = entry_from_interval(interval).unwrap();
        assert_eq!(entry.mode, TimerMode::Timer);
        assert_eq!(entry.started_at_unix, 2_000_000_000);
        assert_eq!(entry.ended_at_unix, 2_000_000_090);
        assert_eq!(entry.duration_secs, 90);
        assert!(Uuid::parse_str(&entry.id).is_ok());
    }

    #[test]
    fn entry_from_interval_withholds_at_or_under_ten_seconds() {
        let started = SystemTime::UNIX_EPOCH + Duration::from_secs(2_000_000_000);
        let ten_seconds = FinishedInterval {
            mode: TimerMode::Timer,
            started_at: started,
            ended_at: started + Duration::from_secs(10),
        };
        assert!(entry_from_interval(ten_seconds).is_none());

        let eleven_seconds = FinishedInterval {
            mode: TimerMode::Timer,
            started_at: started,
            ended_at: started + Duration::from_secs(11),
        };
        assert!(entry_from_interval(eleven_seconds).is_some());
    }

    #[test]
    fn roundtrip_save_and_load() {
        let dir = temp_dir("roundtrip");
        fs::create_dir_all(&dir).unwrap();
        let store = EntriesStore::new(dir.clone());

        let entry = Entry {
            id: "entry-1".into(),
            mode: TimerMode::Stopwatch,
            started_at_unix: 1_700_000_000,
            ended_at_unix: 1_700_000_060,
            duration_secs: 60,
        };
        store.append(entry.clone()).unwrap();

        let loaded = store.load_all();
        assert_eq!(loaded, vec![entry]);

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn append_preserves_existing_entries_and_appends_atomically() {
        let dir = temp_dir("append");
        fs::create_dir_all(&dir).unwrap();
        let store = EntriesStore::new(dir.clone());

        let first = Entry {
            id: "first".into(),
            mode: TimerMode::Timer,
            started_at_unix: 100,
            ended_at_unix: 200,
            duration_secs: 100,
        };
        let second = Entry {
            id: "second".into(),
            mode: TimerMode::Timer,
            started_at_unix: 300,
            ended_at_unix: 400,
            duration_secs: 100,
        };
        store.append(first.clone()).unwrap();
        store.append(second.clone()).unwrap();

        assert_eq!(store.load_all(), vec![first, second]);
        assert!(!dir.join("entries.json.tmp").exists());

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn load_all_on_missing_file_returns_empty() {
        let dir = temp_dir("missing");
        let store = EntriesStore::new(dir);
        assert_eq!(store.load_all(), Vec::new());
    }

    fn unix_at_local(y: i32, m: u32, d: u32, h: u32, min: u32, s: u32) -> u64 {
        Local
            .with_ymd_and_hms(y, m, d, h, min, s)
            .unwrap()
            .timestamp() as u64
    }

    #[test]
    fn totals_bucket_by_calendar_day_week_and_month() {
        // "Now" is Wednesday 2024-01-17, 12:00 local.
        let now = SystemTime::UNIX_EPOCH
            + Duration::from_secs(unix_at_local(2024, 1, 17, 12, 0, 0));

        let entries = vec![
            // Today, 09:00 -> counts toward all three buckets.
            Entry {
                id: "today".into(),
                mode: TimerMode::Timer,
                started_at_unix: unix_at_local(2024, 1, 17, 9, 0, 0),
                ended_at_unix: unix_at_local(2024, 1, 17, 9, 10, 0),
                duration_secs: 600,
            },
            // Monday this week (week start), before today -> week + month only.
            Entry {
                id: "this-week".into(),
                mode: TimerMode::Timer,
                started_at_unix: unix_at_local(2024, 1, 15, 8, 0, 0),
                ended_at_unix: unix_at_local(2024, 1, 15, 8, 5, 0),
                duration_secs: 300,
            },
            // Earlier this month, before this week -> month only.
            Entry {
                id: "this-month".into(),
                mode: TimerMode::Timer,
                started_at_unix: unix_at_local(2024, 1, 3, 8, 0, 0),
                ended_at_unix: unix_at_local(2024, 1, 3, 8, 5, 0),
                duration_secs: 300,
            },
            // Last month -> none of the buckets.
            Entry {
                id: "last-month".into(),
                mode: TimerMode::Timer,
                started_at_unix: unix_at_local(2023, 12, 20, 8, 0, 0),
                ended_at_unix: unix_at_local(2023, 12, 20, 8, 5, 0),
                duration_secs: 300,
            },
        ];

        let totals = compute_totals(&entries, now);
        assert_eq!(totals.today, 600);
        assert_eq!(totals.this_week, 900);
        assert_eq!(totals.this_month, 1200);
    }

    #[test]
    fn entry_exactly_at_day_boundary_counts_toward_the_new_day() {
        let now = SystemTime::UNIX_EPOCH
            + Duration::from_secs(unix_at_local(2024, 1, 17, 23, 59, 0));
        let entries = vec![Entry {
            id: "midnight".into(),
            mode: TimerMode::Timer,
            started_at_unix: unix_at_local(2024, 1, 17, 0, 0, 0),
            ended_at_unix: unix_at_local(2024, 1, 17, 0, 1, 0),
            duration_secs: 60,
        }];
        assert_eq!(compute_totals(&entries, now).today, 60);

        let entries_before_midnight = vec![Entry {
            id: "before-midnight".into(),
            mode: TimerMode::Timer,
            started_at_unix: unix_at_local(2024, 1, 16, 23, 59, 59),
            ended_at_unix: unix_at_local(2024, 1, 17, 0, 0, 30),
            duration_secs: 31,
        }];
        assert_eq!(compute_totals(&entries_before_midnight, now).today, 0);
    }

    #[test]
    fn entry_exactly_at_week_boundary_counts_toward_the_new_week() {
        // Week starts Monday 2024-01-15.
        let now = SystemTime::UNIX_EPOCH
            + Duration::from_secs(unix_at_local(2024, 1, 17, 12, 0, 0));
        let on_monday = vec![Entry {
            id: "monday".into(),
            mode: TimerMode::Timer,
            started_at_unix: unix_at_local(2024, 1, 15, 0, 0, 0),
            ended_at_unix: unix_at_local(2024, 1, 15, 0, 1, 0),
            duration_secs: 60,
        }];
        assert_eq!(compute_totals(&on_monday, now).this_week, 60);

        let before_monday = vec![Entry {
            id: "sunday".into(),
            mode: TimerMode::Timer,
            started_at_unix: unix_at_local(2024, 1, 14, 23, 59, 0),
            ended_at_unix: unix_at_local(2024, 1, 14, 23, 59, 30),
            duration_secs: 30,
        }];
        assert_eq!(compute_totals(&before_monday, now).this_week, 0);
    }

    #[test]
    fn entry_exactly_at_month_boundary_counts_toward_the_new_month() {
        let now = SystemTime::UNIX_EPOCH
            + Duration::from_secs(unix_at_local(2024, 1, 17, 12, 0, 0));
        let on_first = vec![Entry {
            id: "first".into(),
            mode: TimerMode::Timer,
            started_at_unix: unix_at_local(2024, 1, 1, 0, 0, 0),
            ended_at_unix: unix_at_local(2024, 1, 1, 0, 1, 0),
            duration_secs: 60,
        }];
        assert_eq!(compute_totals(&on_first, now).this_month, 60);

        let before_first = vec![Entry {
            id: "last-day-of-december".into(),
            mode: TimerMode::Timer,
            started_at_unix: unix_at_local(2023, 12, 31, 23, 59, 0),
            ended_at_unix: unix_at_local(2023, 12, 31, 23, 59, 30),
            duration_secs: 30,
        }];
        assert_eq!(compute_totals(&before_first, now).this_month, 0);
    }

    #[test]
    fn both_modes_contribute_to_totals() {
        let now = SystemTime::UNIX_EPOCH
            + Duration::from_secs(unix_at_local(2024, 1, 17, 12, 0, 0));
        let entries = vec![
            Entry {
                id: "timer".into(),
                mode: TimerMode::Timer,
                started_at_unix: unix_at_local(2024, 1, 17, 9, 0, 0),
                ended_at_unix: unix_at_local(2024, 1, 17, 9, 5, 0),
                duration_secs: 300,
            },
            Entry {
                id: "stopwatch".into(),
                mode: TimerMode::Stopwatch,
                started_at_unix: unix_at_local(2024, 1, 17, 10, 0, 0),
                ended_at_unix: unix_at_local(2024, 1, 17, 10, 5, 0),
                duration_secs: 300,
            },
        ];
        assert_eq!(compute_totals(&entries, now).today, 600);
    }
}
