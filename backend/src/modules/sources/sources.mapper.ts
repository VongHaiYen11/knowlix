export function sourceRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content ?? undefined,
    tags: row.tags,
    category: row.category,
    created: row.created,
    status: row.status,
    meta: row.meta,
    excerpt: row.excerpt,
    fileId: row.file_id ?? undefined,
  }
}
