import assert from 'node:assert/strict'
import test from 'node:test'
import { pendingSourceRow } from '../src/modules/sources/sources.mapper.js'
import { DeleteSourceUseCase } from '../src/modules/sources/use-cases/DeleteSource.usecase.js'

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
