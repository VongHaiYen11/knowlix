import { jsonrepair } from 'jsonrepair'

function stripMarkdownCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

/**
 * Parse JSON emitted by an LLM. Structured output can still contain small
 * syntax defects (most commonly unescaped quotes/backslashes in Markdown), so
 * keep strict JSON.parse as the primary path and repair syntax only on failure.
 */
export function parseModelJson(text: string): unknown {
  const cleaned = stripMarkdownCodeFence(text)

  try {
    return JSON.parse(cleaned)
  } catch (parseError) {
    const hasCompleteContainer = (
      (cleaned.startsWith('{') && cleaned.endsWith('}'))
      || (cleaned.startsWith('[') && cleaned.endsWith(']'))
    )
    if (!hasCompleteContainer) throw parseError

    try {
      return JSON.parse(jsonrepair(cleaned))
    } catch (repairError) {
      const parseMessage = parseError instanceof Error ? parseError.message : 'invalid JSON'
      const repairMessage = repairError instanceof Error ? repairError.message : 'repair failed'
      throw new Error(`${parseMessage}; automatic repair failed: ${repairMessage}`)
    }
  }
}
