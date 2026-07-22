import assert from 'node:assert/strict'
import test from 'node:test'
import { pendingSourceRow } from '../src/modules/sources/sources.mapper.js'
import { isAllowedUploadFile } from '../src/modules/sources/sources.upload.js'
import { DeleteSourceUseCase } from '../src/modules/sources/use-cases/DeleteSource.usecase.js'
import { IngestSourceFileUseCase } from '../src/modules/sources/use-cases/IngestSourceFile.usecase.js'

test('pending source mapper isolates database naming from the API response', () => {
  const result = pendingSourceRow({
    id: 'source_1',
    user_id: 'user_1',
    type: 'Markdown',
    title: 'ANN',
    tags: ['ml'],
    category: 'AI',
    created: 'Jul 22, 2026',
    status: 'Processing',
    meta: 'ann.md',
    excerpt: 'Summary',
    file_id: 'file_1',
    raw_storage_object_id: 'storage_1',
    extracted_storage_object_id: null,
    summary_storage_object_id: null,
    knowledge_tags: ['ml'],
  })

  assert.equal(result.userId, 'user_1')
  assert.equal(result.rawStorageObjectId, 'storage_1')
  assert.equal('user_id' in result, false)
})

test('source upload accepts common PDF browser MIME variants', () => {
  assert.equal(isAllowedUploadFile({
    originalname: 'paper.pdf',
    mimetype: 'application/pdf',
  } as Express.Multer.File), true)
  assert.equal(isAllowedUploadFile({
    originalname: 'scanned.pdf',
    mimetype: 'application/x-pdf',
  } as Express.Multer.File), true)
  assert.equal(isAllowedUploadFile({
    originalname: 'not-a-pdf.exe',
    mimetype: 'application/pdf',
  } as Express.Multer.File), false)
})

test('DeleteSourceUseCase delegates through its injected repository port', async () => {
  const calls: Array<[string, string]> = []
  const useCase = new DeleteSourceUseCase({
    async deleteWithKnowledgeDetach(userId, sourceId) {
      calls.push([userId, sourceId])
      return { orphanSlugs: [], detachedSlugs: [] }
    },
  })

  await useCase.execute('user_1', 'source_1')
  assert.deepEqual(calls, [['user_1', 'source_1']])
})

test('Drive reingest keeps the source id and can await completion', async () => {
  const calls: string[] = []
  const pending = {
    id: 'source_1', user_id: 'user_1', type: 'Markdown', title: 'Existing', tags: [],
    category: 'AI', created: 'Jul 22, 2026', status: 'Processing', meta: 'drive.md',
    excerpt: '', file_id: 'file_1', raw_storage_object_id: 'storage_1',
    extracted_storage_object_id: null, summary_storage_object_id: null, knowledge_tags: [],
  }
  const useCase = new IngestSourceFileUseCase({
    storage: {
      async upload() { return { id: 'storage_1', url: 'storage://raw' } as any },
    },
    sourceRepository: {
      async createUploadedFile() { calls.push('upload') },
      async create() { throw new Error('new source must not be created') },
      async find(userId, sourceId) {
        assert.deepEqual([userId, sourceId], ['user_1', 'source_1'])
        return pending as any
      },
      async prepareReingest(input) {
        calls.push(`reingest:${input.sourceId}`)
        return pending as any
      },
    },
    customization: {
      async effectiveProfile() { return { ingestModel: 'gemini-2.5-flash' } as any },
    },
    summaryGenerator: {
      async execute(input) {
        calls.push(`generate:${input.sourceId}`)
        return { status: 'completed' as const }
      },
    },
  })

  const result = await useCase.execute('user_1', {
    originalName: 'drive.md', mimeType: 'text/markdown', size: 4, buffer: Buffer.from('test'),
  }, { existingSourceId: 'source_1', awaitCompletion: true, metaPrefix: 'Google Drive' })

  assert.equal(result.ingest.source.id, 'source_1')
  assert.equal(result.completion?.status, 'completed')
  assert.deepEqual(calls, ['upload', 'reingest:source_1', 'generate:source_1'])
})
