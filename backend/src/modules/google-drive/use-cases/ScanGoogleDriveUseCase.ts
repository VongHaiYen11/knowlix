import { env } from '../../../config/env.js'
import { decryptDriveToken } from '../google-drive.crypto.js'
import { googleDriveAdapter, type GoogleDriveAdapter } from '../google-drive.adapter.js'
import { googleAuthorizationError, googleDriveErrorMessage } from '../google-drive.errors.js'
import { googleDriveRepository, type GoogleDriveRepository } from '../google-drive.repository.js'

type Dependencies = {
  repository: Pick<GoogleDriveRepository, 'upsertScannedFiles' | 'completeScan' | 'failConnection'>
  drive: Pick<GoogleDriveAdapter, 'listDirectFiles'>
}

const defaults: Dependencies = { repository: googleDriveRepository, drive: googleDriveAdapter }

export class ScanGoogleDriveUseCase {
  constructor(private readonly dependencies: Dependencies = defaults) {}

  async executeClaimed(connection: any) {
    const userId = String(connection.user_id)
    try {
      const refreshToken = decryptDriveToken(connection.encrypted_refresh_token)
      const files = await this.dependencies.drive.listDirectFiles(refreshToken, connection.folder_id)
      await this.dependencies.repository.upsertScannedFiles(userId, files, new Date())
      await this.dependencies.repository.completeScan(userId, env.googleDriveSyncIntervalMs)
      console.info(`[Google Drive] scan finished user=${userId} folder=${connection.folder_id} files=${files.length}`)
    } catch (error) {
      const requiresAuthorization = googleAuthorizationError(error)
      const message = googleDriveErrorMessage(error)
      await this.dependencies.repository.failConnection(userId, message, requiresAuthorization, env.googleDriveSyncIntervalMs)
      console.error(`[Google Drive] scan failed user=${userId} reauthorize=${requiresAuthorization}:`, message)
    }
  }
}
