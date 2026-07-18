import { pool } from '../../database/pool.js'
import type { AiCustomizationProfile, AiReasoning } from './ai-customization.defaults.js'

export interface AiCustomizationRow {
  ingest_model: string
  research_model: string
  ingest_reasoning: AiReasoning
  research_reasoning: AiReasoning
  ingest_temperature: string | number | null
  research_temperature: string | number | null
  knowledge_definition: string
  knowledge_extraction_instructions: string
  research_answer_instructions: string
  created_at: Date
  updated_at: Date
}

export const aiCustomizationRepository = {
  async find(userId: string) {
    const result = await pool.query<AiCustomizationRow>('SELECT * FROM user_ai_customizations WHERE user_id=$1', [userId])
    return result.rows[0] ?? null
  },

  async upsert(userId: string, profile: AiCustomizationProfile) {
    const result = await pool.query<AiCustomizationRow>(
      `INSERT INTO user_ai_customizations
        (user_id,ingest_model,research_model,ingest_reasoning,research_reasoning,ingest_temperature,research_temperature,knowledge_definition,knowledge_extraction_instructions,research_answer_instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id) DO UPDATE SET
        ingest_model=EXCLUDED.ingest_model,
        research_model=EXCLUDED.research_model,
        ingest_reasoning=EXCLUDED.ingest_reasoning,
        research_reasoning=EXCLUDED.research_reasoning,
        ingest_temperature=EXCLUDED.ingest_temperature,
        research_temperature=EXCLUDED.research_temperature,
        knowledge_definition=EXCLUDED.knowledge_definition,
        knowledge_extraction_instructions=EXCLUDED.knowledge_extraction_instructions,
        research_answer_instructions=EXCLUDED.research_answer_instructions,
        updated_at=now()
       RETURNING *`,
      [
        userId,
        profile.ingestModel,
        profile.researchModel,
        profile.ingestReasoning,
        profile.researchReasoning,
        profile.ingestTemperature,
        profile.researchTemperature,
        profile.knowledgeDefinition,
        profile.knowledgeExtractionInstructions,
        profile.researchAnswerInstructions,
      ],
    )
    return result.rows[0]
  },

  async delete(userId: string) {
    await pool.query('DELETE FROM user_ai_customizations WHERE user_id=$1', [userId])
  },
}
