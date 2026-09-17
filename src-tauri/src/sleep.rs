use std::time::{Duration, Instant, SystemTime};

/// Detects Mac sleep by comparing monotonic vs wall-clock advances between ticks.
#[derive(Debug)]
pub struct SleepDetector {
    last_mono: Instant,
    last_wall: SystemTime,
    last_remaining: u64,
}

impl SleepDetector {
    pub fn new(remaining: u64) -> Self {
        Self {
            last_mono: Instant::now(),
            last_wall: SystemTime::now(),
            last_remaining: remaining,
        }
    }

    pub fn note_remaining(&mut self, remaining: u64) {
        self.last_remaining = remaining;
    }

    /// Returns `Some((remaining_before_sleep, sleep_onset))` when a sleep
    /// gap is detected. `sleep_onset` is the last wall-clock reading before
    /// the gap — the best available approximation of when the run actually
    /// stopped being observed.
    pub fn poll_sleep(&mut self) -> Option<(u64, SystemTime)> {
        let now_mono = Instant::now();
        let now_wall = SystemTime::now();

        let mono_delta = now_mono.saturating_duration_since(self.last_mono);
        let wall_delta = now_wall.duration_since(self.last_wall).unwrap_or_default();

        let remaining_before_sleep = self.last_remaining;
        let sleep_onset = self.last_wall;

        self.last_mono = now_mono;
        self.last_wall = now_wall;

        // Wall clock jumped ahead of monotonic time → system slept.
        if wall_delta > mono_delta + Duration::from_secs(2) {
            Some((remaining_before_sleep, sleep_onset))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_sleep_on_normal_tick() {
        let mut detector = SleepDetector::new(100);
        std::thread::sleep(Duration::from_millis(20));
        assert!(detector.poll_sleep().is_none());
    }
}
