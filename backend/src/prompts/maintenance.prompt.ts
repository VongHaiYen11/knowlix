export function getMaintenancePrompt(entriesList: any[]): string {
  return `You are maintaining a private knowledge workspace. Scan the following Knowledge entries for logical contradictions, stale claims, or conflicting information between entries.
Only report conflicts that are grounded in the provided titles and overviews. Do not invent external facts.

Knowledge Entries:
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
