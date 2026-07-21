import { sourcesRepository } from '../sources.repository.js'

export class DeleteSourceUseCase {
  async execute(userId: string, id: string): Promise<void> {
    await sourcesRepository.deleteWithKnowledgeDetach(userId, id)
  }
}
