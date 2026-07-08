export function knowledgeRow(row: any) {
  return {
    slug: row.slug,
    title: row.title,
    content: undefined,
    contentUrl: row.markdown_storage_object_id ? `/api/v1/knowledge/${encodeURIComponent(row.slug)}/content` : undefined,
    markdownStorageObjectId: row.markdown_storage_object_id ?? undefined,
    overview: row.overview,
    category: row.category,
    tags: row.tags,
    knowledgeTags: row.knowledge_tags ?? row.tags,
    workspaceLabels: row.workspace_labels ?? [],
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
