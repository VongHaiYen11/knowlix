import { GoogleGenAI } from '@google/genai'
import { env } from './env.js'
import { AppError } from '../errors/index.js'

export function getGeminiClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Missing GEMINI_API_KEY configuration')
  }
  return new GoogleGenAI({ apiKey: env.geminiApiKey })
}
