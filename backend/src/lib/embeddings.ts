import { env } from '../config/env.js'
import { getGeminiClient } from '../config/gemini.js'

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim()
  if (!trimmed) return []
  const response = await getGeminiClient().models.embedContent({
    model: env.geminiEmbeddingModel,
    contents: [trimmed],
    config: { outputDimensionality: 768 },
  })
  return response.embeddings?.[0]?.values ?? []
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0
  let dot = 0
  let aMag = 0
  let bMag = 0
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    aMag += a[index] * a[index]
    bMag += b[index] * b[index]
  }
  if (!aMag || !bMag) return 0
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag))
}
