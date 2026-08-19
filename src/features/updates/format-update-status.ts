export function formatUpdateStatus(status: {
  kind: string
  manual?: boolean
  version?: string
  downloaded?: number
  total?: number | null
  message?: string
}): string {
  switch (status.kind) {
    case 'checking':
      return 'Checking for updates…'
    case 'upToDate':
      return status.manual ? '' : "You're up to date."
    case 'available':
      return status.version
        ? `Update ${status.version} is available.`
        : 'An update is available.'
    case 'downloading': {
      const downloaded = status.downloaded ?? 0
      const total = status.total
      if (total && total > 0) {
        const percent = Math.min(100, Math.round((downloaded / total) * 100))
        return `Downloading update… ${percent}%`
      }
      return 'Downloading update…'
    }
    case 'installing':
      return 'Installing update…'
    case 'readyToRestart':
      return status.version
        ? `Version ${status.version} is installed. Restart when ready.`
        : 'Update installed. Restart when ready.'
    case 'error':
      return 'Update check failed. Please try again later.'
    default:
      return ''
  }
}
