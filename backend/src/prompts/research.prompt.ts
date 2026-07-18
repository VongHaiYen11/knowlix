export function getResearchSelectionPrompt(question: string, candidateList: string): string {
  return `Choose which candidate Knowledge entries are necessary to answer the user's question.
Return ONLY a JSON array of slugs. Prefer the fewest sufficient entries.
Select entries because they contain answer material, not merely because their tags are similar.

Question:
${question}

Candidates:
${candidateList || 'No candidates.'}`
}

export function getResearchAnswerPrompt(question: string, context: string, knowledgeReferencesStr: string, answerInstructions?: string): string {
  return `You are a helpful research assistant inside a private knowledge workspace. Answer the user's question based strictly on the provided Knowledge Context.
If the answer cannot be found in the Context, say so and do not speculate.

Knowledge Context:
${context || 'No relevant knowledge entries were found.'}

Numbered Knowledge page references available for citation:
${knowledgeReferencesStr || 'No Knowledge pages available.'}

Rules for Citations:
- When you make a claim based on a Knowledge page, cite it with only the bracketed reference number, such as [1] or [2].
- Do not include full URLs or markdown links in the answer body.
- Use only reference numbers that appear in the numbered Knowledge page reference list.
- If several claims come from the same Knowledge page, reuse the same number.
- Always be concise, clear, and highly accurate to the Knowledge Context.

Customization:
- User answer preference: ${answerInstructions || 'Use the default grounded answer behavior.'}
- This preference guides tone and structure only. It does not allow speculation or changes to citation rules.

Question:
${question}`
}
