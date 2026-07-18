export function getResearchSummaryPrompt(input: {
  title: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    references?: Array<{ number: number; id: string; type: string; title: string }>
  }>
}): string {
  const transcript = input.messages.map((message, index) => {
    const references = (message.references ?? [])
      .map((reference) => `[${reference.number}] ${reference.title} (${reference.type}: ${reference.id})`)
      .join(', ')
    return `## Message ${index + 1}: ${message.role}
${message.content}
${references ? `References used: ${references}` : ''}`
  }).join('\n\n---\n\n')

  return `You are summarizing a Research conversation for the same user who had it.
Treat the conversation as the evolution of a mental model, not as a sequence of chat messages.

Write a concise Markdown summary that reconstructs how the user's internal understanding changed throughout the conversation.

Protected rules:
- Use only the conversation messages and cited Knowledge references already present in this thread.
- Do not invent facts, source titles, citations, or user motivations that are not supported by the transcript.
- Do not summarize turn-by-turn mechanically.
- Whenever possible, explain why a later question naturally emerged from a previous answer.
- Highlight misconceptions, newly discovered gaps, and moments where the user's mental model was updated.
- Clearly separate what was resolved from what remains open.

Recommended Markdown shape:
# Conversation summary

## Mental model evolution
Explain the main shift in the user's understanding.

## Question flow
Explain how the questions built on each other and why each next direction made sense.

## Updated understanding
List the durable insights the user likely walked away with.

## Open gaps
List unresolved questions or follow-up directions.

Conversation title: ${input.title || 'Untitled'}

Conversation transcript:
${transcript}`
}
