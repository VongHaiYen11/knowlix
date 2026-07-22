import { google, type drive_v3 } from 'googleapis'
import { env } from '../../config/env.js'
import { AppError } from '../../errors/index.js'

export const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
export const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder'
export const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type DriveFileMetadata = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string | null
  version: string
  checksum: string
  sizeBytes: number | null
}

export type DriveFolderMetadata = {
  id: string
  name: string
  modifiedTime: string | null
  parentIds: string[]
}

function oauthClient() {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new AppError(503, 'INTERNAL_ERROR', 'Google Drive OAuth is not configured')
  }
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleDriveRedirectUri)
}

function driveClient(refreshToken: string) {
  const auth = oauthClient()
  auth.setCredentials({ refresh_token: refreshToken })
  return google.drive({ version: 'v3', auth })
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function directFolderChildrenQuery(folderId: string) {
  return `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`
}

export function supportedDriveFile(file: Pick<DriveFileMetadata, 'name' | 'mimeType'>): boolean {
  if (file.mimeType === GOOGLE_DOC_MIME) return true
  return /\.(pdf|docx|txt|md|markdown)$/i.test(file.name)
}

export function normalizedDriveFile(file: Pick<DriveFileMetadata, 'name' | 'mimeType'>) {
  if (file.mimeType === GOOGLE_DOC_MIME) {
    return { originalName: `${file.name}.docx`, mimeType: DOCX_MIME }
  }
  return { originalName: file.name, mimeType: file.mimeType || 'application/octet-stream' }
}

function metadata(file: drive_v3.Schema$File): DriveFileMetadata | null {
  if (!file.id || !file.name || !file.mimeType) return null
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime ?? null,
    version: file.version ?? '',
    checksum: file.md5Checksum ?? '',
    sizeBytes: file.size ? Number(file.size) : null,
  }
}

export const googleDriveAdapter = {
  authorizationUrl(state: string) {
    return oauthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [DRIVE_READONLY_SCOPE],
      state,
    })
  },

  async exchangeCode(code: string) {
    const auth = oauthClient()
    const { tokens } = await auth.getToken(code)
    if (!tokens.refresh_token) throw new AppError(400, 'VALIDATION_ERROR', 'Google did not return an offline refresh token. Please reconnect and grant access again.')
    auth.setCredentials(tokens)
    const drive = google.drive({ version: 'v3', auth })
    const about = await drive.about.get({ fields: 'user(emailAddress)' })
    return {
      refreshToken: tokens.refresh_token,
      scopes: tokens.scope?.split(' ').filter(Boolean) ?? [DRIVE_READONLY_SCOPE],
      email: about.data.user?.emailAddress ?? '',
    }
  },

  async validateFolder(refreshToken: string, folderId: string) {
    const response = await driveClient(refreshToken).files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,trashed,ownedByMe',
    })
    if (response.data.trashed || response.data.mimeType !== GOOGLE_FOLDER_MIME || response.data.ownedByMe === false) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Choose a readable folder from My Drive')
    }
    return { id: response.data.id!, name: response.data.name ?? 'Google Drive folder' }
  },

  async listFolders(refreshToken: string): Promise<DriveFolderMetadata[]> {
    const drive = driveClient(refreshToken)
    const folders: DriveFolderMetadata[] = []
    let pageToken: string | undefined
    do {
      const response = await drive.files.list({
        q: `mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false and 'me' in owners`,
        fields: 'nextPageToken,files(id,name,modifiedTime,parents)',
        orderBy: 'name',
        pageSize: 100,
        pageToken,
        spaces: 'drive',
      })
      for (const folder of response.data.files ?? []) {
        if (folder.id && folder.name) {
          folders.push({
            id: folder.id,
            name: folder.name,
            modifiedTime: folder.modifiedTime ?? null,
            parentIds: folder.parents ?? [],
          })
        }
      }
      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)
    return folders
  },

  async listDirectFiles(refreshToken: string, folderId: string): Promise<DriveFileMetadata[]> {
    const drive = driveClient(refreshToken)
    const files: DriveFileMetadata[] = []
    let pageToken: string | undefined
    do {
      const response = await drive.files.list({
        q: directFolderChildrenQuery(folderId),
        fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,version,md5Checksum,size)',
        pageSize: 1000,
        pageToken,
        spaces: 'drive',
      })
      for (const file of response.data.files ?? []) {
        if (file.mimeType === GOOGLE_FOLDER_MIME) continue
        const parsed = metadata(file)
        if (parsed) files.push(parsed)
      }
      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)
    return files
  },

  async downloadFile(refreshToken: string, file: DriveFileMetadata) {
    const drive = driveClient(refreshToken)
    const response = file.mimeType === GOOGLE_DOC_MIME
      ? await drive.files.export({ fileId: file.id, mimeType: DOCX_MIME }, { responseType: 'arraybuffer' })
      : await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'arraybuffer' })
    const normalized = normalizedDriveFile(file)
    return { ...normalized, buffer: Buffer.from(response.data as ArrayBuffer) }
  },

  async revoke(refreshToken: string) {
    const auth = oauthClient()
    await auth.revokeToken(refreshToken)
  },
}

export type GoogleDriveAdapter = typeof googleDriveAdapter
