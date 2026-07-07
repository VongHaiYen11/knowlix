export function knowledgeRow(row: any) {
  return {
    slug: row.slug,
    title: row.title,
    content: row.content ?? undefined,
    overview: row.overview,
    category: row.category,
    tags: row.tags,
    created: row.created,
    updated: row.updated,
    readTime: row.read_time,
    keyIdeas: row.key_ideas,
    explanation: row.explanation,
    examples: row.examples,
    related: row.related,
    references: row.reference_list,
    sources: row.source_list,
    timeline: row.timeline,
  }
}
