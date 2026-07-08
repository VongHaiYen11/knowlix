export function getMaintenancePrompt(entriesList: any[]): string {
  return `You are a knowledge base maintainer. Scan the following list of knowledge base entries for any logical contradictions, stale claims, or conflicting information between them.

Knowledge Base Entries:
${JSON.stringify(entriesList, null, 2)}

Return ONLY a valid JSON array of objects representing contradictions found. Format:
[
  {
    "slugs": ["slug-1", "slug-2"],
    "explanation": "Description of the contradiction or stale claim..."
  }
]
If no contradictions are found, return an empty array []. Do not include markdown code fences, extra words, or annotations. Return plain JSON only.`
}
