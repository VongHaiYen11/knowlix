import { sourcesRepository } from '../sources.repository.js'

export class DeleteSourceUseCase {
  constructor(
    private readonly sourceRepository: Pick<typeof sourcesRepository, 'deleteWithKnowledgeDetach'> = sourcesRepository,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    await this.sourceRepository.deleteWithKnowledgeDetach(userId, id)
  }
}
