import fs from 'node:fs'
import path from 'node:path'
import { env } from '../../config/env.js'
import { getGeminiClient } from '../../config/gemini.js'
import { todayLabel } from '../../utils/date.js'
import { slugify } from '../../utils/text.js'
import { maintenanceRepository } from './maintenance.repository.js'

export const maintenanceService = {
  async lint(user: { id: string; name: string }) {
    const knowledge = await maintenanceRepository.knowledge(user.id)
    const links = await maintenanceRepository.links(user.id)
    const incomingLinks = new Set<string>()
    for (const link of links) incomingLinks.add(link.target)
    const orphanedSlugs = knowledge.filter((row) => !incomingLinks.has(row.slug)).map((row) => row.slug)

    const existingSlugs = new Set(knowledge.map((row) => row.slug))
    const missingConceptsMap = new Map<string, string[]>()
    for (const row of knowledge) {
      const text = `${row.overview} ${row.content || ''}`
      const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
      let match
      while ((match = wikilinkRegex.exec(text)) !== null) {
        const targetSlug = slugify(match[1].trim())
        if (targetSlug && !existingSlugs.has(targetSlug)) {
          if (!missingConceptsMap.has(targetSlug)) missingConceptsMap.set(targetSlug, [])
          if (!missingConceptsMap.get(targetSlug)!.includes(row.slug)) missingConceptsMap.get(targetSlug)!.push(row.slug)
        }
      }
    }

    const missingDetails: string[] = []
    for (const [missingSlug, referringSlugs] of missingConceptsMap.entries()) {
      await maintenanceRepository.addSuggestedNode(user.id, missingSlug)
      for (const refSlug of referringSlugs) await maintenanceRepository.addLink(user.id, refSlug, missingSlug)
      missingDetails.push(`- **${missingSlug}** (referenced by: ${referringSlugs.map((slug) => `[[${slug}]]`).join(', ')})`)
    }

    const entriesList = knowledge.map((row) => ({ slug: row.slug, title: row.title, overview: row.overview }))
    const prompt = `You are a knowledge base maintainer. Scan the following list of knowledge base entries for any logical contradictions, stale claims, or conflicting information between them.

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

    const response = await getGeminiClient().models.generateContent({ model: env.geminiModel, contents: prompt })
    let contradictions: Array<{ slugs: string[]; explanation: string }> = []
    try {
      const cleanText = response.text ? response.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim() : '[]'
      contradictions = JSON.parse(cleanText)
    } catch (parseErr) {
      console.error('[Lint API] Failed to parse Gemini contradiction JSON:', parseErr, response.text)
    }

    const contradictionDetails: string[] = []
    for (const contradiction of contradictions) {
      if (Array.isArray(contradiction.slugs) && contradiction.slugs.length > 0) {
        for (const slug of contradiction.slugs) await maintenanceRepository.markLowConfidence(user.id, slug)
        contradictionDetails.push(`- **Contradiction between: ${contradiction.slugs.map((slug) => `[[${slug}]]`).join(', ')}**\n  *Explanation:* ${contradiction.explanation}\n  *Action:* Flagged confidence score to low.`)
      }
    }

    const dateStr = todayLabel()
    const isoDate = new Date().toISOString().split('T')[0]
    const report = `# Knowledge Base Lint Maintenance Report
**Date:** ${dateStr} (${isoDate})
**User:** ${user.name}

---

## Orphaned Pages
Identify pages with no incoming connections from any other pages:
${orphanedSlugs.length > 0 ? orphanedSlugs.map((slug) => `- [[${slug}]]`).join('\n') : '*No orphaned pages detected.*'}

---

## Missing Links / Suggested Concepts
Identify concepts referenced by \`[[wikilinks]]\` but not created.
*Action Taken: Automatically upserted suggested placeholder nodes and links into the knowledge graph.*

${missingDetails.length > 0 ? missingDetails.join('\n') : '*No missing links detected.*'}

---

## Logical Contradictions & Stale Claims
Identify conflicting claims across pages.
*Action Taken: Automatically lowered confidence scores of conflicting pages to 'low'.*

${contradictionDetails.length > 0 ? contradictionDetails.join('\n\n') : '*No logical contradictions or stale claims detected.*'}

---

## Maintenance Summary
- **Orphaned Pages:** ${orphanedSlugs.length}
- **Missing Concepts Added to Graph:** ${missingConceptsMap.size}
- **Contradictions Flagged:** ${contradictions.length}
`
    const outputsDir = path.resolve('outputs')
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true })
    fs.writeFileSync(path.join(outputsDir, `lint-${isoDate}.md`), report, 'utf8')
    return report
  },
}
