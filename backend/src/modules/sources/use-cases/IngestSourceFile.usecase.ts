import path from 'node:path'
import crypto from 'node:crypto'
import { AppError } from '../../../errors/index.js'
import { excerpt } from '../../../utils/text.js'
import { todayLabel } from '../../../utils/date.js'
import { storageService } from '../../../lib/storage.js'
import { sourcesRepository } from '../sources.repository.js'
import { aiCustomizationService } from '../../ai-customization/ai-customization.service.js'
import { GenerateSourceSummaryUseCase } from './GenerateSourceSummary.usecase.js'

function sourceTypeFromUpload(mimeType: string, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF'
  if (extension === 'docx') return 'DOCX'
  if (extension === 'txt') return 'TXT'
  if (extension === 'md' || extension === 'markdown') return 'Markdown'
  throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload PDF, DOCX, TXT, or Markdown files only.')
}

export class IngestSourceFileUseCase {
  private readonly generateSourceSummary = new GenerateSourceSummaryUseCase()

  async execute(userId: string, file: Express.Multer.File) {
    const fileId = `file_${crypto.randomUUID()}`
    const rawObject = await storageService.upload({
      userId,
      kind: 'raw_source',
      originalName: file.originalname,
      body: file.buffer,
      mimeType: file.mimetype || 'application/octet-stream',
    })
    await sourcesRepository.createUploadedFile({
      id: fileId,
      userId,
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      rawPath: rawObject.url,
      storageObjectId: rawObject.id
    })

    const sourceId = `source_${crypto.randomUUID()}`
    const created = todayLabel()
    const uploadedType = sourceTypeFromUpload(file.mimetype, file.originalname)
    const baseName = path.parse(file.originalname).name
    const sourceInsert = await sourcesRepository.create({
      id: sourceId,
      userId,
      type: uploadedType,
      title: baseName,
      content: null,
      tags: [],
      category: 'Uncategorized',
      created,
      status: 'Processing',
      meta: `${file.originalname} - ${Math.ceil(file.size / 1024)} KB`,
      excerpt: excerpt(baseName),
      fileId,
      rawStorageObjectId: rawObject.id,
      extractedStorageObjectId: null,
      summaryStorageObjectId: null,
      knowledgeTags: [],
    })

    const customization = await aiCustomizationService.effectiveProfile(userId)
    this.generateSourceSummary.execute({
      userId,
      fileId,
      sourceId,
      rawStorageObjectId: rawObject.id,
      rawStorageUrl: rawObject.url,
      originalName: file.originalname,
      created,
      uploadedType,
      customization
    }).catch((err) => {
      console.error('[Ingest] Unhandled background ingest rejection:', err)
    })

    return {
      fileId,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      rawPath: rawObject.url,
      rawStorageObjectId: rawObject.id,
      ingest: {
        status: 'pending',
        written: [],
        message: undefined,
        source: {
          id: sourceInsert.id,
          userId: sourceInsert.user_id,
          type: sourceInsert.type,
          title: sourceInsert.title,
          tags: sourceInsert.tags,
          category: sourceInsert.category,
          created: sourceInsert.created,
          status: sourceInsert.status,
          meta: sourceInsert.meta,
          excerpt: sourceInsert.excerpt,
          fileId: sourceInsert.file_id,
          rawStorageObjectId: sourceInsert.raw_storage_object_id,
          extractedStorageObjectId: sourceInsert.extracted_storage_object_id,
          summaryStorageObjectId: sourceInsert.summary_storage_object_id,
          knowledgeTags: sourceInsert.knowledge_tags,
        },
        knowledge: []
      },
    }
  }
}
