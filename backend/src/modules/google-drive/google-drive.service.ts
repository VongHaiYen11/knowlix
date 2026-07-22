import { createHash, randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import { AppError, ConflictError, NotFoundError } from '../../errors/index.js'
import { decryptDriveToken, encryptDriveToken } from './google-drive.crypto.js'
import { googleDriveConfigured, requireGoogleDriveConfiguration } from './google-drive.config.js'
import { googleDriveAdapter, type GoogleDriveAdapter } from './google-drive.adapter.js'
import { googleDriveStatusRow } from './google-drive.mapper.js'
import { googleDriveRepository, type GoogleDriveRepository } from './google-drive.repository.js'
import { googleDriveScheduler } from './google-drive.scheduler.js'

function stateHash(state: string) {
  return createHash('sha256').update(state).digest('hex')
}

type GoogleDriveServiceDependencies = {
  repository: Pick<GoogleDriveRepository,
    'createOauthState' | 'consumeOauthState' | 'upsertConnection' | 'connectionStatus' |
    'findConnection' | 'setFolder' | 'requestSync' | 'deleteConnection'>
  drive: Pick<GoogleDriveAdapter, 'authorizationUrl' | 'exchangeCode' | 'validateFolder' | 'listFolders' | 'revoke'>
  scheduler: Pick<typeof googleDriveScheduler, 'wake'>
  encryptToken: typeof encryptDriveToken
  decryptToken: typeof decryptDriveToken
  configured: typeof googleDriveConfigured
  requireConfiguration: typeof requireGoogleDriveConfiguration
}

const defaultDependencies: GoogleDriveServiceDependencies = {
  repository: googleDriveRepository,
  drive: googleDriveAdapter,
  scheduler: googleDriveScheduler,
  encryptToken: encryptDriveToken,
  decryptToken: decryptDriveToken,
  configured: googleDriveConfigured,
  requireConfiguration: requireGoogleDriveConfiguration,
}

export class GoogleDriveService {
  constructor(private readonly dependencies: GoogleDriveServiceDependencies = defaultDependencies) {}

  async startOauth(userId: string) {
    this.dependencies.requireConfiguration()
    const state = randomBytes(32).toString('base64url')
    await this.dependencies.repository.createOauthState(stateHash(state), userId, new Date(Date.now() + 10 * 60 * 1000))
    return { authorizationUrl: this.dependencies.drive.authorizationUrl(state) }
  }

  async completeOauth(code: string, state: string) {
    const userId = await this.dependencies.repository.consumeOauthState(stateHash(state))
    if (!userId) throw new AppError(400, 'VALIDATION_ERROR', 'Google Drive authorization state is invalid or expired')
    const credentials = await this.dependencies.drive.exchangeCode(code)
    await this.dependencies.repository.upsertConnection({
      userId,
      encryptedRefreshToken: this.dependencies.encryptToken(credentials.refreshToken),
      email: credentials.email,
      scopes: credentials.scopes,
    })
  }

  async status(userId: string) {
    return {
      ...googleDriveStatusRow(await this.dependencies.repository.connectionStatus(userId)),
      configured: this.dependencies.configured(),
    }
  }

  async folders(userId: string) {
    const connection = await this.dependencies.repository.findConnection(userId)
    if (!connection) throw new NotFoundError('Connect Google Drive before choosing a folder')
    const folders = await this.dependencies.drive.listFolders(this.dependencies.decryptToken(connection.encrypted_refresh_token))
    return { folders }
  }

  async setFolder(userId: string, folderId: string) {
    const connection = await this.dependencies.repository.findConnection(userId)
    if (!connection) throw new NotFoundError('Connect Google Drive before choosing a folder')
    if (connection.status === 'syncing') throw new ConflictError('Wait for the current Google Drive sync to finish before changing folders')
    const folder = await this.dependencies.drive.validateFolder(this.dependencies.decryptToken(connection.encrypted_refresh_token), folderId)
    const updated = await this.dependencies.repository.setFolder(userId, folder.id, folder.name)
    if (!updated) throw new ConflictError('Wait for the current Google Drive sync to finish before changing folders')
    this.dependencies.scheduler.wake()
    return {
      ...googleDriveStatusRow(await this.dependencies.repository.connectionStatus(userId)),
      configured: this.dependencies.configured(),
    }
  }

  async syncNow(userId: string) {
    const accepted = await this.dependencies.repository.requestSync(userId)
    if (!accepted) throw new ConflictError('Google Drive is not connected, has no folder, or needs authorization')
    this.dependencies.scheduler.wake()
    return { accepted: true }
  }

  async disconnect(userId: string) {
    const encryptedToken = await this.dependencies.repository.deleteConnection(userId)
    if (!encryptedToken) return
    try {
      await this.dependencies.drive.revoke(this.dependencies.decryptToken(encryptedToken))
    } catch {
      console.warn(`[Google Drive] token revoke failed user=${userId}`)
    }
  }

  callbackRedirect(status: 'connected' | 'error', message?: string) {
    const url = new URL('/settings', env.frontendOrigin)
    url.searchParams.set('integration', 'google-drive')
    url.searchParams.set('status', status)
    if (message) url.searchParams.set('message', message.slice(0, 160))
    return url.toString()
  }
}

export const googleDriveService = new GoogleDriveService()
