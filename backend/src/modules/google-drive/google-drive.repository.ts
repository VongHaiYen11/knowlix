import { pool } from '../../database/pool.js'
import type { DriveFileMetadata } from './google-drive.adapter.js'

const CONNECTION_LEASE_MINUTES = 30
const FILE_LEASE_MINUTES = 60

export const googleDriveRepository = {
  async createOauthState(stateHash: string, userId: string, expiresAt: Date) {
    await pool.query('DELETE FROM google_drive_oauth_states WHERE expires_at <= now() OR user_id=$1', [userId])
    await pool.query(
      'INSERT INTO google_drive_oauth_states (state_hash,user_id,expires_at) VALUES ($1,$2,$3)',
      [stateHash, userId, expiresAt],
    )
  },

  async consumeOauthState(stateHash: string) {
    const { rows } = await pool.query(
      `DELETE FROM google_drive_oauth_states
       WHERE state_hash=$1 AND expires_at > now()
       RETURNING user_id`,
      [stateHash],
    )
    return rows[0]?.user_id as string | undefined
  },

  async upsertConnection(input: {
    userId: string
    encryptedRefreshToken: string
    email: string
    scopes: string[]
  }) {
    const { rows } = await pool.query(
      `INSERT INTO google_drive_connections
        (user_id,encrypted_refresh_token,google_account_email,granted_scopes,status,next_sync_at,last_error)
       VALUES ($1,$2,$3,$4,'connected',NULL,NULL)
       ON CONFLICT (user_id) DO UPDATE SET
        encrypted_refresh_token=EXCLUDED.encrypted_refresh_token,
        google_account_email=EXCLUDED.google_account_email,
        granted_scopes=EXCLUDED.granted_scopes,
        status='connected',last_error=NULL,sync_lease_until=NULL,updated_at=now()
       RETURNING *`,
      [input.userId, input.encryptedRefreshToken, input.email, input.scopes],
    )
    return rows[0]
  },

  async findConnection(userId: string) {
    const { rows } = await pool.query('SELECT * FROM google_drive_connections WHERE user_id=$1', [userId])
    return rows[0]
  },

  async connectionStatus(userId: string) {
    const { rows } = await pool.query(
      `SELECT connection.*,
        COALESCE(file_counts.counts, '{}'::jsonb) AS file_counts
       FROM google_drive_connections connection
       LEFT JOIN LATERAL (
         SELECT jsonb_object_agg(status, count) AS counts
         FROM (
           SELECT status,count(*)::int AS count
           FROM google_drive_files
           WHERE user_id=connection.user_id
           GROUP BY status
         ) grouped_counts
       ) file_counts ON true
       WHERE connection.user_id=$1`,
      [userId],
    )
    return rows[0]
  },

  async setFolder(userId: string, folderId: string, folderName: string) {
    const { rows } = await pool.query(
      `UPDATE google_drive_connections
       SET folder_id=$1,folder_name=$2,status='connected',next_sync_at=now(),last_error=NULL,sync_lease_until=NULL,updated_at=now()
       WHERE user_id=$3 AND status <> 'syncing'
       RETURNING *`,
      [folderId, folderName, userId],
    )
    return rows[0]
  },

  async deleteConnection(userId: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        'DELETE FROM google_drive_connections WHERE user_id=$1 RETURNING encrypted_refresh_token',
        [userId],
      )
      await client.query('DELETE FROM google_drive_files WHERE user_id=$1', [userId])
      await client.query('DELETE FROM google_drive_oauth_states WHERE user_id=$1', [userId])
      await client.query('COMMIT')
      return rows[0]?.encrypted_refresh_token as string | undefined
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async requestSync(userId: string) {
    const result = await pool.query(
      `UPDATE google_drive_connections
       SET next_sync_at=now(),last_error=NULL,updated_at=now()
       WHERE user_id=$1 AND folder_id IS NOT NULL AND status <> 'reauthorization_required'`,
      [userId],
    )
    await pool.query(
      `UPDATE google_drive_files
       SET status='pending',attempt_count=0,next_attempt_at=now(),last_error=NULL,updated_at=now()
       WHERE user_id=$1 AND status='failed'`,
      [userId],
    )
    return Boolean(result.rowCount)
  },

  async claimDueConnection() {
    const { rows } = await pool.query(
      `WITH candidate AS (
         SELECT user_id
         FROM google_drive_connections
         WHERE folder_id IS NOT NULL
           AND status <> 'reauthorization_required'
           AND (next_sync_at IS NULL OR next_sync_at <= now())
           AND (sync_lease_until IS NULL OR sync_lease_until <= now())
         ORDER BY next_sync_at NULLS FIRST,updated_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE google_drive_connections connection
       SET status='syncing',sync_lease_until=now() + ($1 || ' minutes')::interval,updated_at=now()
       FROM candidate
       WHERE connection.user_id=candidate.user_id
       RETURNING connection.*`,
      [CONNECTION_LEASE_MINUTES],
    )
    return rows[0]
  },

  async upsertScannedFiles(userId: string, files: DriveFileMetadata[], scanStartedAt: Date) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const file of files) {
        await client.query(
          `INSERT INTO google_drive_files
            (user_id,drive_file_id,name,mime_type,modified_time,drive_version,checksum,size_bytes,status,next_attempt_at,last_seen_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',now(),$9)
           ON CONFLICT (user_id,drive_file_id) DO UPDATE SET
            name=EXCLUDED.name,mime_type=EXCLUDED.mime_type,modified_time=EXCLUDED.modified_time,
            drive_version=EXCLUDED.drive_version,checksum=EXCLUDED.checksum,size_bytes=EXCLUDED.size_bytes,
            last_seen_at=EXCLUDED.last_seen_at,
            status=CASE
              WHEN google_drive_files.processed_version=EXCLUDED.drive_version
                AND google_drive_files.processed_checksum=EXCLUDED.checksum
                AND google_drive_files.processed_modified_time IS NOT DISTINCT FROM EXCLUDED.modified_time
              THEN 'processed'
              WHEN google_drive_files.status='processing' AND google_drive_files.processing_lease_until > now()
              THEN 'processing'
              ELSE 'pending'
            END,
            attempt_count=CASE
              WHEN google_drive_files.processed_version=EXCLUDED.drive_version
                AND google_drive_files.processed_checksum=EXCLUDED.checksum
                AND google_drive_files.processed_modified_time IS NOT DISTINCT FROM EXCLUDED.modified_time
              THEN google_drive_files.attempt_count ELSE 0 END,
            next_attempt_at=CASE
              WHEN google_drive_files.processed_version=EXCLUDED.drive_version
                AND google_drive_files.processed_checksum=EXCLUDED.checksum
                AND google_drive_files.processed_modified_time IS NOT DISTINCT FROM EXCLUDED.modified_time
              THEN google_drive_files.next_attempt_at ELSE now() END,
            last_error=CASE
              WHEN google_drive_files.processed_version=EXCLUDED.drive_version
                AND google_drive_files.processed_checksum=EXCLUDED.checksum
                AND google_drive_files.processed_modified_time IS NOT DISTINCT FROM EXCLUDED.modified_time
              THEN google_drive_files.last_error ELSE NULL END,
            updated_at=now()`,
          [userId, file.id, file.name, file.mimeType, file.modifiedTime, file.version, file.checksum, file.sizeBytes, scanStartedAt],
        )
      }
      await client.query(
        `UPDATE google_drive_files
         SET status='removed',processing_lease_until=NULL,updated_at=now()
         WHERE user_id=$1 AND last_seen_at < $2 AND status <> 'removed'`,
        [userId, scanStartedAt],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async completeScan(userId: string, intervalMs: number) {
    await pool.query(
      `UPDATE google_drive_connections
       SET status='connected',last_sync_at=now(),next_sync_at=now() + ($1 || ' milliseconds')::interval,
        last_error=NULL,sync_lease_until=NULL,updated_at=now()
       WHERE user_id=$2`,
      [intervalMs, userId],
    )
  },

  async failConnection(userId: string, message: string, requiresAuthorization: boolean, intervalMs: number) {
    await pool.query(
      `UPDATE google_drive_connections
       SET status=$1,last_error=$2,next_sync_at=CASE WHEN $1='error' THEN now() + ($3 || ' milliseconds')::interval ELSE NULL END,
        sync_lease_until=NULL,updated_at=now()
       WHERE user_id=$4`,
      [requiresAuthorization ? 'reauthorization_required' : 'error', message, intervalMs, userId],
    )
  },

  async claimPendingFile() {
    const { rows } = await pool.query(
      `WITH candidate AS (
         SELECT file.user_id,file.drive_file_id
         FROM google_drive_files file
         JOIN google_drive_connections connection ON connection.user_id=file.user_id
         WHERE file.status IN ('pending','failed')
           AND file.attempt_count < 4
           AND (file.next_attempt_at IS NULL OR file.next_attempt_at <= now())
           AND (file.processing_lease_until IS NULL OR file.processing_lease_until <= now())
           AND connection.status <> 'reauthorization_required'
         ORDER BY file.next_attempt_at NULLS FIRST,file.updated_at
         LIMIT 1
         FOR UPDATE OF file SKIP LOCKED
       )
       UPDATE google_drive_files file
       SET status='processing',processing_lease_until=now() + ($1 || ' minutes')::interval,updated_at=now()
       FROM candidate
       WHERE file.user_id=candidate.user_id AND file.drive_file_id=candidate.drive_file_id
       RETURNING file.*`,
      [FILE_LEASE_MINUTES],
    )
    if (!rows[0]) return undefined
    const connection = await googleDriveRepository.findConnection(rows[0].user_id)
    return connection ? { file: rows[0], connection } : undefined
  },

  async markFileProcessed(input: {
    userId: string
    driveFileId: string
    sourceId: string
    modifiedTime: string | null
    version: string
    checksum: string
  }) {
    await pool.query(
      `UPDATE google_drive_files
       SET source_id=$1,status='processed',processed_modified_time=$2,processed_version=$3,processed_checksum=$4,
        attempt_count=0,next_attempt_at=NULL,processing_lease_until=NULL,last_error=NULL,updated_at=now()
       WHERE user_id=$5 AND drive_file_id=$6`,
      [input.sourceId, input.modifiedTime, input.version, input.checksum, input.userId, input.driveFileId],
    )
  },

  async markFileUnsupported(userId: string, driveFileId: string, message: string) {
    await pool.query(
      `UPDATE google_drive_files
       SET status='unsupported',processing_lease_until=NULL,next_attempt_at=NULL,last_error=$1,updated_at=now()
       WHERE user_id=$2 AND drive_file_id=$3`,
      [message, userId, driveFileId],
    )
  },

  async markFileFailed(userId: string, driveFileId: string, message: string, retryAt: Date | null, requiresAuthorization: boolean) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE google_drive_files
         SET status='failed',attempt_count=attempt_count+1,next_attempt_at=$1,processing_lease_until=NULL,last_error=$2,updated_at=now()
         WHERE user_id=$3 AND drive_file_id=$4`,
        [retryAt, message, userId, driveFileId],
      )
      if (requiresAuthorization) {
        await client.query(
          `UPDATE google_drive_connections
           SET status='reauthorization_required',last_error=$1,next_sync_at=NULL,sync_lease_until=NULL,updated_at=now()
           WHERE user_id=$2`,
          [message, userId],
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },
}

export type GoogleDriveRepository = typeof googleDriveRepository
