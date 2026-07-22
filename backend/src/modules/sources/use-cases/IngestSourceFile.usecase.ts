import path from 'node:path'
import crypto from 'node:crypto'
import { AppError } from '../../../errors/index.js'
import { excerpt } from '../../../utils/text.js'
import { todayLabel } from '../../../utils/date.js'
import { storageService } from '../../../lib/storage.js'
import { sourcesRepository } from '../sources.repository.js'
import { aiCustomizationService } from '../../ai-customization/ai-customization.service.js'
import { GenerateSourceSummaryUseCase } from './GenerateSourceSummary.usecase.js'
import { pendingSourceRow } from '../sources.mapper.js'

type IngestSourceFileDependencies = {
  storage: Pick<typeof storageService, 'upload'>
  sourceRepository: Pick<typeof sourcesRepository, 'createUploadedFile' | 'create' | 'find' | 'prepareReingest'>
  customization: Pick<typeof aiCustomizationService, 'effectiveProfile'>
  summaryGenerator: Pick<GenerateSourceSummaryUseCase, 'execute'>
}

export type SourceFileInput = {
  originalName: string
  mimeType: string
  size: number
  buffer: Buffer
}

export type IngestSourceFileOptions = {
  existingSourceId?: string
  awaitCompletion?: boolean
  metaPrefix?: string
}

const defaultDependencies = (): IngestSourceFileDependencies => ({
  storage: storageService,
  sourceRepository: sourcesRepository,
  customization: aiCustomizationService,
  summaryGenerator: new GenerateSourceSummaryUseCase(),
})

function sourceTypeFromUpload(mimeType: string, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF'
  if (extension === 'docx') return 'DOCX'
  if (extension === 'txt') return 'TXT'
  if (extension === 'md' || extension === 'markdown') return 'Markdown'
  throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload PDF, DOCX, TXT, or Markdown files only.')
}

export class IngestSourceFileUseCase {
  constructor(private readonly dependencies: IngestSourceFileDependencies = defaultDependencies()) {}

  async execute(userId: string, file: SourceFileInput, options: IngestSourceFileOptions = {}) {
    const fileId = `file_${crypto.randomUUID()}`
    const rawObject = await this.dependencies.storage.upload({
      userId,
      kind: 'raw_source',
      originalName: file.originalName,
      body: file.buffer,
      mimeType: file.mimeType || 'application/octet-stream',
    })
    await this.dependencies.sourceRepository.createUploadedFile({
      id: fileId,
      userId,
      name: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.size,
      rawPath: rawObject.url,
      storageObjectId: rawObject.id
    })

    const sourceId = options.existingSourceId ?? `source_${crypto.randomUUID()}`
    const created = todayLabel()
    const uploadedType = sourceTypeFromUpload(file.mimeType, file.originalName)
    const baseName = path.parse(file.originalName).name
    const meta = `${options.metaPrefix ? `${options.metaPrefix} - ` : ''}${file.originalName} - ${Math.ceil(file.size / 1024)} KB`
    let sourceInsert
    if (options.existingSourceId) {
      const existing = await this.dependencies.sourceRepository.find(userId, options.existingSourceId)
      if (!existing) throw new AppError(404, 'NOT_FOUND', 'Source selected for Google Drive update no longer exists')
      sourceInsert = await this.dependencies.sourceRepository.prepareReingest({
        userId,
        sourceId,
        type: uploadedType,
        fileId,
        rawStorageObjectId: rawObject.id,
        meta,
      })
    } else {
      sourceInsert = await this.dependencies.sourceRepository.create({
        id: sourceId,
        userId,
        type: uploadedType,
        title: baseName,
        content: null,
        tags: [],
        category: 'Uncategorized',
        created,
        status: 'Processing',
        meta,
        excerpt: excerpt(baseName),
        fileId,
        rawStorageObjectId: rawObject.id,
        extractedStorageObjectId: null,
        summaryStorageObjectId: null,
        knowledgeTags: [],
      })
    }

    const customization = await this.dependencies.customization.effectiveProfile(userId)
    const generation = this.dependencies.summaryGenerator.execute({
      userId,
      fileId,
      sourceId,
      rawStorageObjectId: rawObject.id,
      rawStorageUrl: rawObject.url,
      originalName: file.originalName,
      created: sourceInsert.created ?? created,
      uploadedType,
      customization
    })
    const completion = options.awaitCompletion
      ? await generation
      : undefined
    if (!options.awaitCompletion) {
      generation.catch((err) => {
        console.error('[Ingest] Unhandled background ingest rejection:', err)
      })
    }

    return {
      fileId,
      name: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      rawPath: rawObject.url,
      rawStorageObjectId: rawObject.id,
      ingest: {
        status: 'pending',
        written: [],
        message: undefined,
        source: pendingSourceRow(sourceInsert),
        knowledge: []
      },
      completion,
    }
  }
}
