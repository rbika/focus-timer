use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum TimerMode {
    #[default]
    Timer,
    Stopwatch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    Idle,
    Running,
    Paused,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerEngine {
    mode: TimerMode,
    duration_secs: u64,
    remaining_at_pause: u64,
    /// Absolute deadline while running (timer mode).
    deadline: Option<SystemTime>,
    elapsed_at_pause: u64,
    /// Wall-clock anchor while running (stopwatch mode).
    started_at: Option<SystemTime>,
    status: TimerStatus,
}

impl Default for TimerEngine {
    fn default() -> Self {
        Self::new(0)
    }
}

impl TimerEngine {
    pub fn new(duration_secs: u64) -> Self {
        Self {
            mode: TimerMode::Timer,
            duration_secs,
            remaining_at_pause: duration_secs,
            deadline: None,
            elapsed_at_pause: 0,
            started_at: None,
            status: TimerStatus::Idle,
        }
    }

    pub fn mode(&self) -> TimerMode {
        self.mode
    }

    pub fn status(&self) -> TimerStatus {
        self.status
    }

    pub fn duration_secs(&self) -> u64 {
        self.duration_secs
    }

    pub fn deadline(&self) -> Option<SystemTime> {
        self.deadline
    }

    pub fn started_at(&self) -> Option<SystemTime> {
        self.started_at
    }

    pub fn elapsed_at_pause(&self) -> u64 {
        self.elapsed_at_pause
    }

    pub fn remaining_secs(&self, now: SystemTime) -> u64 {
        match self.status {
            TimerStatus::Running => match self.deadline {
                Some(deadline) => ceil_secs(deadline.duration_since(now).unwrap_or_default()),
                None => 0,
            },
            TimerStatus::Idle | TimerStatus::Paused => self.remaining_at_pause,
            TimerStatus::Completed => 0,
        }
    }

    pub fn elapsed_secs(&self, now: SystemTime) -> u64 {
        match self.status {
            TimerStatus::Running => match self.started_at {
                Some(started) => now.duration_since(started).unwrap_or_default().as_secs(),
                None => 0,
            },
            TimerStatus::Idle | TimerStatus::Paused | TimerStatus::Completed => {
                self.elapsed_at_pause
            }
        }
    }

    /// Sleep this long before the displayed second should change.
    pub fn time_until_display_tick(&self, now: SystemTime) -> Duration {
        match self.mode {
            TimerMode::Timer => self.time_until_display_tick_timer(now),
            TimerMode::Stopwatch => self.time_until_display_tick_stopwatch(now),
        }
    }

    fn time_until_display_tick_timer(&self, now: SystemTime) -> Duration {
        match self.status {
            TimerStatus::Running => match self.deadline {
                Some(deadline) => {
                    let remaining = deadline.duration_since(now).unwrap_or_default();
                    let nanos = remaining.subsec_nanos();
                    if remaining.is_zero() || nanos == 0 {
                        Duration::from_secs(1)
                    } else {
                        Duration::new(0, nanos)
                    }
                }
                None => Duration::from_secs(1),
            },
            TimerStatus::Idle | TimerStatus::Paused | TimerStatus::Completed => {
                Duration::from_secs(1)
            }
        }
    }

    fn time_until_display_tick_stopwatch(&self, now: SystemTime) -> Duration {
        match self.status {
            TimerStatus::Running => match self.started_at {
                Some(started) => {
                    let elapsed = now.duration_since(started).unwrap_or_default();
                    let nanos = elapsed.subsec_nanos();
                    if nanos == 0 {
                        Duration::from_secs(1)
                    } else {
                        Duration::new(0, 1_000_000_000 - nanos)
                    }
                }
                None => Duration::from_secs(1),
            },
            TimerStatus::Idle | TimerStatus::Paused | TimerStatus::Completed => {
                Duration::from_secs(1)
            }
        }
    }

    pub fn set_mode(&mut self, mode: TimerMode) {
        if !matches!(self.status, TimerStatus::Idle | TimerStatus::Completed) {
            return;
        }
        self.mode = mode;
        self.deadline = None;
        self.started_at = None;
        self.status = TimerStatus::Idle;
        match mode {
            TimerMode::Timer => {
                self.remaining_at_pause = self.duration_secs;
                self.elapsed_at_pause = 0;
            }
            TimerMode::Stopwatch => {
                self.elapsed_at_pause = 0;
                self.remaining_at_pause = self.duration_secs;
            }
        }
    }

    pub fn set_duration(&mut self, duration_secs: u64) {
        self.duration_secs = duration_secs;
        if matches!(self.status, TimerStatus::Idle | TimerStatus::Completed) {
            self.remaining_at_pause = duration_secs;
            self.deadline = None;
            self.started_at = None;
            self.status = TimerStatus::Idle;
        }
    }

    pub fn start(&mut self, now: SystemTime) {
        match self.mode {
            TimerMode::Timer => self.start_timer(now),
            TimerMode::Stopwatch => self.start_stopwatch(now),
        }
    }

    fn start_timer(&mut self, now: SystemTime) {
        if matches!(self.status, TimerStatus::Completed) {
            self.remaining_at_pause = self.duration_secs;
        }
        if self.remaining_at_pause == 0 {
            self.remaining_at_pause = self.duration_secs;
        }
        if self.remaining_at_pause == 0 {
            return;
        }
        self.deadline = Some(now + Duration::from_secs(self.remaining_at_pause));
        self.started_at = None;
        self.status = TimerStatus::Running;
    }

    fn start_stopwatch(&mut self, now: SystemTime) {
        if matches!(self.status, TimerStatus::Completed) {
            self.elapsed_at_pause = 0;
        }
        self.started_at = Some(now - Duration::from_secs(self.elapsed_at_pause));
        self.deadline = None;
        self.status = TimerStatus::Running;
    }

    pub fn pause(&mut self, now: SystemTime) {
        if self.status != TimerStatus::Running {
            return;
        }
        match self.mode {
            TimerMode::Timer => self.pause_timer(now),
            TimerMode::Stopwatch => self.pause_stopwatch(now),
        }
    }

    fn pause_timer(&mut self, now: SystemTime) {
        self.remaining_at_pause = self.remaining_secs(now);
        self.deadline = None;
        self.status = if self.remaining_at_pause == 0 {
            TimerStatus::Completed
        } else {
            TimerStatus::Paused
        };
    }

    fn pause_stopwatch(&mut self, now: SystemTime) {
        self.elapsed_at_pause = self.elapsed_secs(now);
        self.started_at = None;
        self.status = TimerStatus::Paused;
    }

    pub fn resume(&mut self, now: SystemTime) {
        if self.status != TimerStatus::Paused {
            return;
        }
        match self.mode {
            TimerMode::Timer => self.resume_timer(now),
            TimerMode::Stopwatch => self.resume_stopwatch(now),
        }
    }

    fn resume_timer(&mut self, now: SystemTime) {
        if self.remaining_at_pause == 0 {
            self.status = TimerStatus::Completed;
            return;
        }
        self.deadline = Some(now + Duration::from_secs(self.remaining_at_pause));
        self.started_at = None;
        self.status = TimerStatus::Running;
    }

    fn resume_stopwatch(&mut self, now: SystemTime) {
        self.started_at = Some(now - Duration::from_secs(self.elapsed_at_pause));
        self.deadline = None;
        self.status = TimerStatus::Running;
    }

    pub fn toggle_pause(&mut self, now: SystemTime) {
        match self.status {
            TimerStatus::Running => self.pause(now),
            TimerStatus::Paused => self.resume(now),
            TimerStatus::Idle | TimerStatus::Completed => self.start(now),
        }
    }

    pub fn reset(&mut self) {
        self.deadline = None;
        self.started_at = None;
        self.status = TimerStatus::Idle;
        match self.mode {
            TimerMode::Timer => {
                self.remaining_at_pause = self.duration_secs;
            }
            TimerMode::Stopwatch => {
                self.elapsed_at_pause = 0;
            }
        }
    }

    /// Advance wall-clock state. Returns `true` if the timer just completed.
    pub fn tick(&mut self, now: SystemTime) -> bool {
        if self.mode == TimerMode::Stopwatch {
            return false;
        }
        if self.status != TimerStatus::Running {
            return false;
        }
        let remaining = self.remaining_secs(now);
        if remaining == 0 {
            self.deadline = None;
            self.remaining_at_pause = 0;
            self.status = TimerStatus::Completed;
            return true;
        }
        false
    }

    /// Restore a previously running timer after process restart.
    pub fn restore_running(&mut self, deadline: SystemTime, now: SystemTime) {
        self.mode = TimerMode::Timer;
        self.deadline = Some(deadline);
        self.started_at = None;
        self.status = TimerStatus::Running;
        if self.tick(now) {
            // completed during downtime
        } else {
            self.remaining_at_pause = self.remaining_secs(now);
        }
    }

    pub fn restore_stopwatch_running(&mut self, started_at: SystemTime, _now: SystemTime) {
        self.mode = TimerMode::Stopwatch;
        self.started_at = Some(started_at);
        self.deadline = None;
        self.status = TimerStatus::Running;
    }

    pub fn restore_paused(&mut self, remaining_secs: u64) {
        self.mode = TimerMode::Timer;
        self.deadline = None;
        self.started_at = None;
        self.remaining_at_pause = remaining_secs.min(self.duration_secs);
        self.status = if self.remaining_at_pause == 0 {
            TimerStatus::Completed
        } else {
            TimerStatus::Paused
        };
    }

    pub fn restore_stopwatch_paused(&mut self, elapsed_secs: u64) {
        self.mode = TimerMode::Stopwatch;
        self.deadline = None;
        self.started_at = None;
        self.elapsed_at_pause = elapsed_secs;
        self.status = TimerStatus::Paused;
    }

    pub fn restore_completed(&mut self) {
        self.mode = TimerMode::Timer;
        self.deadline = None;
        self.started_at = None;
        self.remaining_at_pause = 0;
        self.status = TimerStatus::Completed;
    }
}

/// Kitchen-timer rounding: keep showing N until that second has fully elapsed.
fn ceil_secs(duration: Duration) -> u64 {
    let secs = duration.as_secs();
    if duration.subsec_nanos() == 0 {
        secs
    } else {
        secs.saturating_add(1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn t0() -> SystemTime {
        SystemTime::UNIX_EPOCH + Duration::from_secs(1_700_000_000)
    }

    #[test]
    fn start_pause_resume_preserves_remaining() {
        let mut engine = TimerEngine::new(100);
        let now = t0();
        engine.start(now);
        assert_eq!(engine.status(), TimerStatus::Running);
        assert_eq!(engine.remaining_secs(now), 100);

        let later = now + Duration::from_secs(40);
        engine.pause(later);
        assert_eq!(engine.status(), TimerStatus::Paused);
        assert_eq!(engine.remaining_secs(later), 60);

        let resume_at = later + Duration::from_secs(1_000);
        engine.resume(resume_at);
        assert_eq!(engine.status(), TimerStatus::Running);
        assert_eq!(engine.remaining_secs(resume_at), 60);
        assert_eq!(
            engine.remaining_secs(resume_at + Duration::from_secs(10)),
            50
        );
    }

    #[test]
    fn remaining_holds_full_second_until_it_elapses() {
        let mut engine = TimerEngine::new(60);
        let now = t0();
        engine.start(now);
        assert_eq!(engine.remaining_secs(now), 60);
        assert_eq!(engine.remaining_secs(now + Duration::from_millis(1)), 60);
        assert_eq!(engine.remaining_secs(now + Duration::from_millis(999)), 60);
        assert_eq!(engine.remaining_secs(now + Duration::from_secs(1)), 59);
        assert_eq!(
            engine.remaining_secs(now + Duration::from_millis(1_001)),
            59
        );
    }

    #[test]
    fn time_until_display_tick_is_the_fractional_remainder() {
        let mut engine = TimerEngine::new(60);
        let now = t0();
        engine.start(now);
        assert_eq!(engine.time_until_display_tick(now), Duration::from_secs(1));
        assert_eq!(
            engine.time_until_display_tick(now + Duration::from_millis(250)),
            Duration::from_millis(750)
        );
        engine.pause(now);
        assert_eq!(engine.time_until_display_tick(now), Duration::from_secs(1));
    }

    #[test]
    fn tick_completes_at_deadline() {
        let mut engine = TimerEngine::new(5);
        let now = t0();
        engine.start(now);
        assert!(!engine.tick(now + Duration::from_secs(4)));
        assert!(engine.tick(now + Duration::from_secs(5)));
        assert_eq!(engine.status(), TimerStatus::Completed);
        assert_eq!(engine.remaining_secs(now + Duration::from_secs(5)), 0);
    }

    #[test]
    fn reset_returns_to_idle_full_duration() {
        let mut engine = TimerEngine::new(90);
        engine.start(t0());
        engine.pause(t0() + Duration::from_secs(30));
        engine.reset();
        assert_eq!(engine.status(), TimerStatus::Idle);
        assert_eq!(engine.remaining_secs(t0()), 90);
    }

    #[test]
    fn restore_running_after_crash_completes_if_past_deadline() {
        let mut engine = TimerEngine::new(30);
        let started = t0();
        let deadline = started + Duration::from_secs(30);
        engine.restore_running(deadline, started + Duration::from_secs(45));
        assert_eq!(engine.status(), TimerStatus::Completed);
    }

    #[test]
    fn restore_running_keeps_remaining() {
        let mut engine = TimerEngine::new(30);
        let started = t0();
        let deadline = started + Duration::from_secs(30);
        engine.restore_running(deadline, started + Duration::from_secs(10));
        assert_eq!(engine.status(), TimerStatus::Running);
        assert_eq!(engine.remaining_secs(started + Duration::from_secs(10)), 20);
    }

    #[test]
    fn set_duration_updates_idle_timer() {
        let mut engine = TimerEngine::new(60);
        engine.set_duration(120);
        assert_eq!(engine.duration_secs(), 120);
        assert_eq!(engine.remaining_secs(t0()), 120);
    }

    #[test]
    fn set_duration_allows_zero() {
        let mut engine = TimerEngine::new(60);
        engine.set_duration(0);
        assert_eq!(engine.duration_secs(), 0);
        assert_eq!(engine.remaining_secs(t0()), 0);
        engine.start(t0());
        assert_eq!(engine.status(), TimerStatus::Idle);
    }

    #[test]
    fn toggle_pause_cycles_states() {
        let mut engine = TimerEngine::new(10);
        let now = t0();
        engine.toggle_pause(now);
        assert_eq!(engine.status(), TimerStatus::Running);
        engine.toggle_pause(now + Duration::from_secs(2));
        assert_eq!(engine.status(), TimerStatus::Paused);
        engine.toggle_pause(now + Duration::from_secs(3));
        assert_eq!(engine.status(), TimerStatus::Running);
    }

    #[test]
    fn stopwatch_start_pause_resume_preserves_elapsed() {
        let mut engine = TimerEngine::new(60);
        engine.set_mode(TimerMode::Stopwatch);
        let now = t0();
        engine.start(now);
        assert_eq!(engine.status(), TimerStatus::Running);
        assert_eq!(engine.elapsed_secs(now), 0);

        let later = now + Duration::from_secs(45);
        engine.pause(later);
        assert_eq!(engine.status(), TimerStatus::Paused);
        assert_eq!(engine.elapsed_secs(later), 45);

        let resume_at = later + Duration::from_secs(100);
        engine.resume(resume_at);
        assert_eq!(engine.status(), TimerStatus::Running);
        assert_eq!(engine.elapsed_secs(resume_at), 45);
        assert_eq!(engine.elapsed_secs(resume_at + Duration::from_secs(10)), 55);
    }

    #[test]
    fn stopwatch_tick_never_completes() {
        let mut engine = TimerEngine::new(60);
        engine.set_mode(TimerMode::Stopwatch);
        let now = t0();
        engine.start(now);
        assert!(!engine.tick(now + Duration::from_secs(3600)));
        assert_eq!(engine.status(), TimerStatus::Running);
    }

    #[test]
    fn stopwatch_reset_clears_elapsed() {
        let mut engine = TimerEngine::new(60);
        engine.set_mode(TimerMode::Stopwatch);
        let now = t0();
        engine.start(now);
        engine.pause(now + Duration::from_secs(30));
        engine.reset();
        assert_eq!(engine.status(), TimerStatus::Idle);
        assert_eq!(engine.elapsed_secs(now), 0);
    }

    #[test]
    fn set_mode_only_when_idle_or_completed() {
        let mut engine = TimerEngine::new(60);
        let now = t0();
        engine.start(now);
        engine.set_mode(TimerMode::Stopwatch);
        assert_eq!(engine.mode(), TimerMode::Timer);
    }

    #[test]
    fn set_mode_resets_to_idle() {
        let mut engine = TimerEngine::new(60);
        engine.set_mode(TimerMode::Stopwatch);
        assert_eq!(engine.mode(), TimerMode::Stopwatch);
        assert_eq!(engine.status(), TimerStatus::Idle);
        assert_eq!(engine.elapsed_secs(t0()), 0);
    }
}
