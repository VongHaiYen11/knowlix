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

function logGeminiFinished(operation: string, args: readonly unknown[], attempt: number, maxAttempts: number, startedAt: number) {
  console.info(`[Gemini API] operation=${operation} model=${modelFromArgs(args)} attempt=${attempt}/${maxAttempts} status=finished durationMs=${Date.now() - startedAt}`)
}

async function* withGeminiStreamLogging<T>(
  stream: AsyncGenerator<T>,
  args: readonly unknown[],
  attempt: number,
  maxAttempts: number,
  startedAt: number,
): AsyncGenerator<T> {
  try {
    for await (const chunk of stream) yield chunk
    logGeminiFinished('generateContentStream', args, attempt, maxAttempts, startedAt)
  } catch (error) {
    console.warn(`[Gemini API] operation=generateContentStream model=${modelFromArgs(args)} attempt=${attempt}/${maxAttempts} status=stream-failed durationMs=${Date.now() - startedAt}:`, error)
    throw error
  }
}

export function getGeminiClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Missing GEMINI_API_KEY configuration')
  }
  const client = new GoogleGenAI({ apiKey: env.geminiApiKey })
  const originalGenerate = client.models.generateContent.bind(client.models)
  const generateContent = async (...args: Parameters<typeof originalGenerate>) => {
    const maxRetries = 3
    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startedAt = Date.now()
        logGeminiCall('generateContent', args, attempt, maxRetries)
        const response = await originalGenerate(...args)
        logGeminiFinished('generateContent', args, attempt, maxRetries, startedAt)
        return response
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

  const originalGenerateStream = client.models.generateContentStream.bind(client.models)
  const generateContentStream = async (...args: Parameters<typeof originalGenerateStream>) => {
    const maxRetries = 3
    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startedAt = Date.now()
        logGeminiCall('generateContentStream', args, attempt, maxRetries)
        const stream = await originalGenerateStream(...args)
        return withGeminiStreamLogging(stream, args, attempt, maxRetries, startedAt)
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

  const originalEmbed = client.models.embedContent.bind(client.models)
  const embedContent = async (...args: Parameters<typeof originalEmbed>) => {
    const maxRetries = 3
    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startedAt = Date.now()
        logGeminiCall('embedContent', args, attempt, maxRetries)
        const response = await originalEmbed(...args)
        logGeminiFinished('embedContent', args, attempt, maxRetries, startedAt)
        return response
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

  const models = new Proxy(client.models, {
    get(target, property) {
      if (property === 'generateContent') return generateContent
      if (property === 'generateContentStream') return generateContentStream
      if (property === 'embedContent') return embedContent
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  return new Proxy(client, {
    get(target, property) {
      if (property === 'models') return models
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
