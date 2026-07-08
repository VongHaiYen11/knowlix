export function sourceRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: undefined,
    rawStorageObjectId: row.raw_storage_object_id ?? undefined,
    extractedStorageObjectId: row.extracted_storage_object_id ?? undefined,
    summaryStorageObjectId: row.summary_storage_object_id ?? undefined,
    contentUrl: row.summary_storage_object_id ? `/api/v1/sources/${encodeURIComponent(row.id)}/content` : undefined,
    tags: row.tags,
    knowledgeTags: row.knowledge_tags ?? row.tags,
    workspaceLabels: row.workspace_labels ?? [],
    category: row.category,
    created: row.created,
    status: row.status,
    meta: row.meta,
    excerpt: row.excerpt,
    fileId: row.file_id ?? undefined,
  }
}
