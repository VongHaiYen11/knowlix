export function getResearchSelectionPrompt(question: string, candidateList: string): string {
  return `Choose which candidate Knowledge Markdown files are necessary to answer the user's question.
Return ONLY a JSON array of slugs. Prefer the fewest sufficient entries.

Question:
${question}

Candidates:
${candidateList || 'No candidates.'}`
}

export function getResearchAnswerPrompt(question: string, context: string, sourcesListStr: string): string {
  return `You are a helpful research assistant. Answer the user's question based strictly on the provided Context.
If the answer cannot be found in the Context, say so and do not speculate.

Context:
${context || 'No knowledge entries match the selected tags/categories in scope.'}

Available sources for citation (MUST link to them in markdown when citing claims):
${sourcesListStr || 'No source documents available.'}

Rules for Citations:
- When you make a claim based on a source, you MUST cite it using a markdown link to its exact URL from the list of available sources. E.g., "...according to the midterm notes [Midterm Notes](http://127.0.0.1:5173/library/source/file_xxx)..."
- Do not make up any other URLs.
- Always be concise, clear, and highly accurate to the Context.

Question:
${question}`
}
