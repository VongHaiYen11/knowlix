export function googleDriveStatusRow(row: any) {
  if (!row) return { connected: false, folder: null, status: 'disconnected', counts: {} }
  return {
    connected: true,
    googleAccountEmail: row.google_account_email,
    folder: row.folder_id ? { id: row.folder_id, name: row.folder_name } : null,
    status: row.status,
    lastSyncAt: row.last_sync_at,
    nextSyncAt: row.next_sync_at,
    lastError: row.last_error,
    counts: row.file_counts ?? {},
  }
}
