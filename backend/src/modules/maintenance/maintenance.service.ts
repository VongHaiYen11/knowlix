import fs from 'node:fs'
import path from 'node:path'
import { getGeminiClient } from '../../config/gemini.js'
import { todayIsoDate, todayLabel } from '../../utils/date.js'
import { slugify } from '../../utils/text.js'
import { storageService } from '../../lib/storage.js'
import { maintenanceRepository } from './maintenance.repository.js'
import { getMaintenancePrompt } from '../../prompts/index.js'

export const maintenanceService = {
  async lint(user: { id: string; name: string }, model: string) {
    const knowledge = await maintenanceRepository.knowledge(user.id)
    const incomingLinks = new Set<string>()
    for (const row of knowledge) {
      for (const related of row.related ?? []) {
        if (related?.slug) incomingLinks.add(related.slug)
      }
    }
    const orphanedSlugs = knowledge.filter((row) => !incomingLinks.has(row.slug)).map((row) => row.slug)

    const existingSlugs = new Set(knowledge.map((row) => row.slug))
    const missingConceptsMap = new Map<string, string[]>()
    for (const row of knowledge) {
      const markdown = row.markdown_storage_object_id
        ? await storageService.readText({ userId: user.id, storageObjectId: row.markdown_storage_object_id }).then((result) => result.text).catch(() => '')
        : ''
      const text = `${row.overview} ${markdown}`
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
      missingDetails.push(`- **${missingSlug}** (referenced by: ${referringSlugs.map((slug) => `[[${slug}]]`).join(', ')})`)
    }

    const entriesList = knowledge.map((row) => ({ slug: row.slug, title: row.title, overview: row.overview }))
    const prompt = getMaintenancePrompt(entriesList)

    const response = await getGeminiClient().models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    })
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
    const isoDate = todayIsoDate()
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
*Action Taken: Reported missing concepts for review.*

${missingDetails.length > 0 ? missingDetails.join('\n') : '*No missing links detected.*'}

---

## Logical Contradictions & Stale Claims
Identify conflicting claims across pages.
*Action Taken: Automatically lowered confidence scores of conflicting pages to 'low'.*

${contradictionDetails.length > 0 ? contradictionDetails.join('\n\n') : '*No logical contradictions or stale claims detected.*'}

---

## Maintenance Summary
- **Orphaned Pages:** ${orphanedSlugs.length}
- **Missing Concepts Reported:** ${missingConceptsMap.size}
- **Contradictions Flagged:** ${contradictions.length}
`
    const outputsDir = path.resolve('outputs')
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true })
    fs.writeFileSync(path.join(outputsDir, `lint-${isoDate}.md`), report, 'utf8')
    return report
  },
}
