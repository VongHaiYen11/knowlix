import type { AiPrompt } from './prompt.types.js'

export function getInspirationPrompt(): AiPrompt {
  return {
    systemInstruction: `Write one warm inspiration sentence for a personal knowledge workspace.

RULES
- Return only the sentence.
- Use 16 words or fewer.
- No quotation marks or emoji.
- Keep it calm, curious, and encouraging.
- Do not mention fake tasks, fake notes, or sample content.`,
    contents: 'Create today’s inspiration sentence about turning source material into useful knowledge.',
  }
}
