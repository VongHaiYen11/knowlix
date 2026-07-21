import { GoogleGenAI } from '@google/genai'
import { env } from './env.js'
import { AppError } from '../errors/index.js'

function modelFromArgs(args: readonly unknown[]): string {
  const request = args[0]
  if (!request || typeof request !== 'object') return 'unknown'
  const model = (request as { model?: unknown }).model
  return typeof model === 'string' && model.trim() ? model : 'unknown'
}

function logGeminiCall(operation: string, args: readonly unknown[], attempt: number, maxAttempts: number) {
  console.info(`[Gemini API] operation=${operation} model=${modelFromArgs(args)} attempt=${attempt}/${maxAttempts}`)
}

export function getGeminiClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Missing GEMINI_API_KEY configuration')
  }
  const client = new GoogleGenAI({ apiKey: env.geminiApiKey })

  // Proxy generateContent to add retry logic
  const originalGenerate = client.models.generateContent.bind(client.models)
  client.models.generateContent = async function (this: any, ...args: Parameters<typeof originalGenerate>) {
    const maxRetries = 3
    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logGeminiCall('generateContent', args, attempt, maxRetries)
        return await originalGenerate(...args)
      } catch (err) {
        lastError = err
        console.warn(`[Gemini API] generateContent failed (attempt ${attempt}/${maxRetries}):`, err)
        if (attempt < maxRetries) {
          // Delay before next attempt (exponential backoff: 1s, 2s)
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        }
      }
    }
    throw lastError
  }

  // Proxy generateContentStream to add retry logic
  const originalGenerateStream = client.models.generateContentStream.bind(client.models)
  client.models.generateContentStream = async function (this: any, ...args: Parameters<typeof originalGenerateStream>) {
    const maxRetries = 3
    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logGeminiCall('generateContentStream', args, attempt, maxRetries)
        return await originalGenerateStream(...args)
      } catch (err) {
        lastError = err
        console.warn(`[Gemini API] generateContentStream failed (attempt ${attempt}/${maxRetries}):`, err)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        }
      }
    }
    throw lastError
  }

  // Proxy embedContent to add retry logic
  const originalEmbed = client.models.embedContent.bind(client.models)
  client.models.embedContent = async function (this: any, ...args: Parameters<typeof originalEmbed>) {
    const maxRetries = 3
    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logGeminiCall('embedContent', args, attempt, maxRetries)
        return await originalEmbed(...args)
      } catch (err) {
        lastError = err
        console.warn(`[Gemini API] embedContent failed (attempt ${attempt}/${maxRetries}):`, err)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        }
      }
    }
    throw lastError
  }

  return client
}
