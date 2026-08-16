/** Splits a duration in seconds into hours, minutes, and seconds. */
function secsToParts(total: number) {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { hours, minutes, seconds }
}

/** Combines hours, minutes, and seconds into a duration in seconds (min 1). */
function partsToSecs(hours: number, minutes: number, seconds: number) {
  return Math.max(1, hours * 3600 + minutes * 60 + seconds)
}

export { secsToParts, partsToSecs }
