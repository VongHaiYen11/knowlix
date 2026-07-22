import assert from 'node:assert/strict'
import test from 'node:test'
import {
  directFolderChildrenQuery,
  DRIVE_READONLY_SCOPE,
  GOOGLE_DOC_MIME,
  GOOGLE_FOLDER_MIME,
  normalizedDriveFile,
  supportedDriveFile,
} from '../src/modules/google-drive/google-drive.adapter.js'
import { GoogleDriveService } from '../src/modules/google-drive/google-drive.service.js'
import { googleDriveStatusRow } from '../src/modules/google-drive/google-drive.mapper.js'
import { googleDriveRetryAt } from '../src/modules/google-drive/use-cases/ProcessGoogleDriveFileUseCase.js'

test('Drive folder direct child query does not traverse subfolders', () => {
  const folderId = '1AbCdEfGhIjKlMnOp'
  assert.equal(directFolderChildrenQuery(folderId), `'${folderId}' in parents and trashed = false`)
  assert.equal(supportedDriveFile({ name: 'nested', mimeType: GOOGLE_FOLDER_MIME }), false)
})

test('Drive import supports planned source formats and exports Google Docs as DOCX', () => {
  assert.equal(supportedDriveFile({ name: 'paper.pdf', mimeType: 'application/pdf' }), true)
  assert.equal(supportedDriveFile({ name: 'notes.markdown', mimeType: 'text/plain' }), true)
  assert.equal(supportedDriveFile({ name: 'sheet', mimeType: 'application/vnd.google-apps.spreadsheet' }), false)
  assert.deepEqual(normalizedDriveFile({ name: 'Course notes', mimeType: GOOGLE_DOC_MIME }), {
    originalName: 'Course notes.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
})

test('OAuth state owns the connection even when the Google email differs and is single use', async () => {
  const states = new Map<string, string>()
  const connections: Array<{ userId: string; email: string; encryptedRefreshToken: string }> = []
  const service = new GoogleDriveService({
    repository: {
      async createOauthState(hash, userId) { states.set(hash, userId) },
      async consumeOauthState(hash) {
        const userId = states.get(hash)
        states.delete(hash)
        return userId
      },
      async upsertConnection(input) { connections.push(input); return input },
    } as any,
    drive: {
      authorizationUrl: (state) => `https://accounts.google.test/oauth?state=${state}`,
      async exchangeCode() {
        return { refreshToken: 'google-refresh-token', email: 'different-google@example.com', scopes: [DRIVE_READONLY_SCOPE] }
      },
    } as any,
    scheduler: { wake() {} },
    encryptToken: (token) => `encrypted:${token}`,
    decryptToken: (token) => token,
    configured: () => true,
    requireConfiguration() {},
  })

  const { authorizationUrl } = await service.startOauth('knowlix-user-a')
  const state = new URL(authorizationUrl).searchParams.get('state')!
  await service.completeOauth('authorization-code', state)

  assert.deepEqual(connections, [{
    userId: 'knowlix-user-a',
    email: 'different-google@example.com',
    encryptedRefreshToken: 'encrypted:google-refresh-token',
    scopes: [DRIVE_READONLY_SCOPE],
  }])
  await assert.rejects(() => service.completeOauth('replayed-code', state), /invalid or expired/)
})

test('Drive retries use 1, 5, and 15 minute backoff before stopping', () => {
  const now = Date.parse('2026-07-22T00:00:00.000Z')
  assert.equal(googleDriveRetryAt(0, now)?.getTime(), now + 60_000)
  assert.equal(googleDriveRetryAt(1, now)?.getTime(), now + 5 * 60_000)
  assert.equal(googleDriveRetryAt(2, now)?.getTime(), now + 15 * 60_000)
  assert.equal(googleDriveRetryAt(3, now), null)
})

test('Drive status mapper keeps database naming out of the API response', () => {
  const result = googleDriveStatusRow({
    google_account_email: 'drive@example.com', folder_id: 'folder_1', folder_name: 'Sources',
    status: 'connected', last_sync_at: '2026-07-22T00:00:00.000Z', next_sync_at: null,
    last_error: null, file_counts: { processed: 2 },
  })
  assert.equal(result.googleAccountEmail, 'drive@example.com')
  assert.deepEqual(result.folder, { id: 'folder_1', name: 'Sources' })
  assert.equal('google_account_email' in result, false)
})

test('in-app folder selection validates the folder and queues sync', async () => {
  const folders: Array<{ userId: string; folderId: string; folderName: string }> = []
  let wakeCount = 0
  const service = new GoogleDriveService({
    repository: {
      async findConnection(userId) {
        assert.equal(userId, 'knowlix-user-a')
        return { encrypted_refresh_token: 'encrypted:google-refresh-token', status: 'connected' }
      },
      async setFolder(userId, folderId, folderName) {
        folders.push({ userId, folderId, folderName })
        return { user_id: userId, folder_id: folderId, folder_name: folderName }
      },
      async connectionStatus(userId) {
        return {
          user_id: userId,
          google_account_email: 'drive@example.com',
          folder_id: '1PickedFolderId',
          folder_name: 'Picked folder',
          status: 'connected',
          file_counts: {},
        }
      },
    } as any,
    drive: {
      async validateFolder(_token, folderId) {
        return { id: folderId, name: 'Picked folder' }
      },
    } as any,
    scheduler: { wake() { wakeCount += 1 } },
    encryptToken: (token) => `encrypted:${token}`,
    decryptToken: (token) => token,
    configured: () => true,
    requireConfiguration() {},
  })

  const status = await service.setFolder('knowlix-user-a', '1PickedFolderId')

  assert.deepEqual(folders, [{
    userId: 'knowlix-user-a',
    folderId: '1PickedFolderId',
    folderName: 'Picked folder',
  }])
  assert.deepEqual(status.folder, { id: '1PickedFolderId', name: 'Picked folder' })
  assert.equal(wakeCount, 1)
})
