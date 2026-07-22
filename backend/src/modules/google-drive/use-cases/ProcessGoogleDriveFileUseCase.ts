import { env } from '../../../config/env.js'
import { IngestSourceFileUseCase } from '../../sources/use-cases/IngestSourceFile.usecase.js'
import { decryptDriveToken } from '../google-drive.crypto.js'
import {
  googleDriveAdapter,
  supportedDriveFile,
  type DriveFileMetadata,
  type GoogleDriveAdapter,
} from '../google-drive.adapter.js'
import { googleAuthorizationError, googleDriveErrorMessage } from '../google-drive.errors.js'
import { googleDriveRepository, type GoogleDriveRepository } from '../google-drive.repository.js'

const GOOGLE_DOC_EXPORT_LIMIT = 10 * 1024 * 1024
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000]

export function googleDriveRetryAt(attempt: number, now = Date.now()): Date | null {
  const delay = RETRY_DELAYS_MS[attempt]
  return delay === undefined ? null : new Date(now + delay)
}

type Dependencies = {
  repository: Pick<GoogleDriveRepository, 'markFileUnsupported' | 'markFileProcessed' | 'markFileFailed'>
  drive: Pick<GoogleDriveAdapter, 'downloadFile'>
  ingest: Pick<IngestSourceFileUseCase, 'execute'>
}

const defaults = (): Dependencies => ({
  repository: googleDriveRepository,
  drive: googleDriveAdapter,
  ingest: new IngestSourceFileUseCase(),
})

function metadata(row: any): DriveFileMetadata {
  return {
    id: row.drive_file_id,
    name: row.name,
    mimeType: row.mime_type,
    modifiedTime: row.modified_time ? new Date(row.modified_time).toISOString() : null,
    version: row.drive_version ?? '',
    checksum: row.checksum ?? '',
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
  }
}

export class ProcessGoogleDriveFileUseCase {
  constructor(private readonly dependencies: Dependencies = defaults()) {}

  async executeClaimed(job: { file: any; connection: any }) {
    const file = metadata(job.file)
    const userId = String(job.file.user_id)
    try {
      if (!supportedDriveFile(file)) {
        await this.dependencies.repository.markFileUnsupported(userId, file.id, 'Unsupported Google Drive file type')
        return
      }
      const maxBytes = env.maxUploadMb * 1024 * 1024
      const effectiveLimit = file.mimeType === 'application/vnd.google-apps.document'
        ? Math.min(maxBytes, GOOGLE_DOC_EXPORT_LIMIT)
        : maxBytes
      if (file.sizeBytes !== null && file.sizeBytes > effectiveLimit) {
        await this.dependencies.repository.markFileUnsupported(userId, file.id, `File exceeds the ${Math.floor(effectiveLimit / 1024 / 1024)} MB import limit`)
        return
      }

      const refreshToken = decryptDriveToken(job.connection.encrypted_refresh_token)
      const downloaded = await this.dependencies.drive.downloadFile(refreshToken, file)
      if (downloaded.buffer.byteLength > effectiveLimit) {
        await this.dependencies.repository.markFileUnsupported(userId, file.id, `File exceeds the ${Math.floor(effectiveLimit / 1024 / 1024)} MB import limit`)
        return
      }

      const result = await this.dependencies.ingest.execute(userId, {
        originalName: downloaded.originalName,
        mimeType: downloaded.mimeType,
        size: downloaded.buffer.byteLength,
        buffer: downloaded.buffer,
      }, {
        existingSourceId: job.file.source_id ?? undefined,
        awaitCompletion: true,
        metaPrefix: 'Google Drive',
      })
      if (result.completion?.status === 'failed') throw new Error(result.completion.message ?? 'Source ingestion failed')

      await this.dependencies.repository.markFileProcessed({
        userId,
        driveFileId: file.id,
        sourceId: result.ingest.source.id,
        modifiedTime: file.modifiedTime,
        version: file.version,
        checksum: file.checksum,
      })
      console.info(`[Google Drive] ingest finished user=${userId} file=${file.id} source=${result.ingest.source.id}`)
    } catch (error) {
      const requiresAuthorization = googleAuthorizationError(error)
      const attempt = Number(job.file.attempt_count ?? 0)
      const retryAt = requiresAuthorization ? null : googleDriveRetryAt(attempt)
      const message = googleDriveErrorMessage(error)
      await this.dependencies.repository.markFileFailed(userId, file.id, message, retryAt, requiresAuthorization)
      console.error(`[Google Drive] ingest failed user=${userId} file=${file.id} reauthorize=${requiresAuthorization}:`, message)
    }
  }
}
