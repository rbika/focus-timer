const MASK_DIGITS = 6
const MAX_HOURS = 99
const MAX_DURATION_SECS = MAX_HOURS * 3600 + 59 * 60 + 59

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Formats seconds as an `HH:MM:SS` mask, clamped to 99:59:59. */
function secsToMask(total: number): string {
  const capped = Math.min(MAX_DURATION_SECS, Math.max(0, Math.floor(total)))
  const hours = Math.floor(capped / 3600)
  const minutes = Math.floor((capped % 3600) / 60)
  const seconds = capped % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/** Parses an `HH:MM:SS` mask into seconds (min 0, max 99:59:59). Overflow carries. */
function maskToSecs(mask: string): number {
  const digits = mask
    .replace(/\D/g, '')
    .slice(-MASK_DIGITS)
    .padStart(MASK_DIGITS, '0')
  const hours = Number(digits.slice(0, 2))
  const minutes = Number(digits.slice(2, 4))
  const seconds = Number(digits.slice(4))
  return Math.min(
    MAX_DURATION_SECS,
    Math.max(0, hours * 3600 + minutes * 60 + seconds),
  )
}

/** Keeps the last 6 digits typed and formats them as `HH:MM:SS`. */
function digitsToMask(raw: string): string {
  const digits = raw
    .replace(/\D/g, '')
    .slice(-MASK_DIGITS)
    .padStart(MASK_DIGITS, '0')
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`
}

/** Formats seconds as a compact label like `25m` or `1h30m`. */
function secsToCompact(total: number): string {
  const capped = Math.min(MAX_DURATION_SECS, Math.max(0, Math.floor(total)))
  if (capped === 0) return '0m'

  const hours = Math.floor(capped / 3600)
  const minutes = Math.floor((capped % 3600) / 60)
  const seconds = capped % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)
  return parts.join('')
}

export { secsToMask, maskToSecs, digitsToMask, secsToCompact }
