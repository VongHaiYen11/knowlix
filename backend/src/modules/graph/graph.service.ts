import { queryList } from '../../utils/query.js'
import { graphRepository } from './graph.repository.js'

export const graphService = {
  async list(userId: string, query: Record<string, unknown>) {
    const tags = queryList(query.tags)
    const categories = queryList(query.categories)
    const params: unknown[] = [userId]
    const filters = ['user_id=$1']
    if (query.q) {
      params.push(`%${String(query.q)}%`)
      filters.push(`label ILIKE $${params.length}`)
    }
    if (tags.length) {
      params.push(tags)
      filters.push(`tags && $${params.length}::text[]`)
    }
    if (categories.length) {
      params.push(categories)
      filters.push(`category = ANY($${params.length}::text[])`)
    }
    return graphRepository.list(filters.join(' AND '), params)
  },
}
