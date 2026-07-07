import { getGeminiClient } from '../../config/gemini.js'

const fallbackQuotes = [
  'Tiny notes become bright paths when you return to them with curiosity.',
  'A quiet page is still progress waiting for your next thought.',
  'Collect gently, connect slowly, and let today teach you one useful thing.',
]

function fallbackQuote(userId: string, date: string) {
  const index = Math.abs([...`${userId}-${date}`].reduce((total, char) => total + char.charCodeAt(0), 0)) % fallbackQuotes.length
  return fallbackQuotes[index]
}

function todayKey() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const inspirationService = {
  async today(userId: string, model: string) {
    const date = todayKey()
    const prompt = `Write one warm, cute inspiration sentence for a personal knowledge workspace.
Rules:
- Return only the sentence.
- 16 words or fewer.
- No quotation marks.
- No emoji.
- Make it feel calm, curious, and encouraging.`

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
