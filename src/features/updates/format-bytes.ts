export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 0.1) {
    return `${mb.toFixed(1)} MB`
  }

  const kb = bytes / 1024
  return `${kb.toFixed(0)} KB`
}

export function formatDownloadProgress(
  downloaded: number,
  total?: number | null,
): string {
  if (total && total > 0) {
    return `${formatBytes(downloaded)} of ${formatBytes(total)}`
  }

  return formatBytes(downloaded)
}
