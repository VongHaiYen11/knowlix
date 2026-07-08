export function noteRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    updated: row.updated,
    words: row.words,
    content: '',
    contentUrl: row.storage_object_id ? `/api/v1/notes/${encodeURIComponent(row.id)}/content` : undefined,
    storageObjectId: row.storage_object_id ?? undefined,
  }
}
