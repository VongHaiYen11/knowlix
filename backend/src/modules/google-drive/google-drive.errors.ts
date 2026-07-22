export function googleAuthorizationError(error: unknown): boolean {
  const status = Number((error as any)?.code ?? (error as any)?.response?.status ?? 0)
  const message = String((error as any)?.message ?? (error as any)?.response?.data?.error ?? '').toLowerCase()
  return status === 401 || message.includes('invalid_grant') || message.includes('unauthorized')
}

export function googleDriveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Google Drive request failed'
  return message.replace(/(?:access|refresh)[_-]?token[^,}\n]*/gi, '[credential removed]').slice(0, 500)
}
