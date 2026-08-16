/// Format seconds as `HH:MM:SS`.
pub fn format_hms(total_secs: u64) -> String {
    let hours = total_secs / 3600;
    let minutes = (total_secs % 3600) / 60;
    let seconds = total_secs % 60;
    format!("{hours:02}:{minutes:02}:{seconds:02}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_zero() {
        assert_eq!(format_hms(0), "00:00:00");
    }

    #[test]
    fn formats_minutes_and_seconds() {
        assert_eq!(format_hms(25 * 60), "00:25:00");
        assert_eq!(format_hms(65), "00:01:05");
    }

    #[test]
    fn formats_hours() {
        assert_eq!(format_hms(3661), "01:01:01");
    }
}
