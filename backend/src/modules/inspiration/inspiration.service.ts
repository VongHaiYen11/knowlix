import { getGeminiClient } from '../../config/gemini.js'
import { getInspirationPrompt } from '../../prompts/index.js'
import { todayIsoDate } from '../../utils/date.js'

const fallbackQuotes = [
  'Tiny notes become bright paths when you return to them with curiosity.',
  'A quiet page is still progress waiting for your next thought.',
  'Collect gently, connect slowly, and let today teach you one useful thing.',
]

function fallbackQuote(userId: string, date: string) {
  const index = Math.abs([...`${userId}-${date}`].reduce((total, char) => total + char.charCodeAt(0), 0)) % fallbackQuotes.length
  return fallbackQuotes[index]
}

export const inspirationService = {
  async today(userId: string, model: string) {
    const date = todayIsoDate()
    const prompt = getInspirationPrompt()

    try {
      const response = await getGeminiClient().models.generateContent({ model, contents: prompt })
      const quote = response.text?.trim().replace(/^["']|["']$/g, '')
      return { date, quote: quote || fallbackQuote(userId, date) }
    } catch (error) {
      console.error('[Inspiration] Gemini generation failed:', error)
      return { date, quote: fallbackQuote(userId, date) }
    }
  },
}
