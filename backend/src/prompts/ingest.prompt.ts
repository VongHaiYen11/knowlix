export function getIngestPrompt(params: {
  originalName: string
  uploadedType: string
  fileKind: string
  rawStorageUrl: string
  candidates: any[]
  extractedText: string
}): string {
  const { originalName, uploadedType, fileKind, rawStorageUrl, candidates, extractedText } = params
  return `You are maintaining a private knowledge wiki from uploaded source files.
The backend has already converted the uploaded file to plain text. Use only the text below. Do not assume access to the original file bytes.

Return ONLY valid JSON in this shape:
{
  "summary": {
    "category": "Short category",
    "tags": ["tag-one"],
    "workspaceLabels": ["work"],
    "body": "# Suggested Title Without File Extension\\n\\nShort descriptive excerpt...\\n\\nDetailed markdown summary grounded in the text..."
  },
  "pages": [
    {
      "action": "create | update | merge | link_only | skip",
      "targetSlug": "existing-slug-when-updating-or-merging",
      "filename": "page-slug.md",
      "title": "Knowledge page title",
      "body": "Markdown knowledge page grounded in the extracted text",
      "related": ["Related concept"],
      "reason": "Short reason for the action"
    }
  ],
  "graphLinks": [
    { "source": "Concept A", "target": "Concept B" }
  ]
}

Rules:
- Return plain JSON only. No markdown code fences.
- Keep every claim grounded in the extracted text.
- Preserve useful Markdown structure when the uploaded file is Markdown.
- Decide whether each useful concept should create a new page, update an existing page, merge into an existing page, only add provenance, or be skipped.
- Use "update" when a candidate Knowledge Entry already covers the concept but needs new details.
- Use "merge" when this source reveals overlapping candidate entries that should become one canonical page.
- Use "link_only" when the source supports an existing entry but does not require Markdown changes.
- Use "skip" when the source has no durable knowledge contribution.
- Put concept/topic tags in "tags".
- Put broad organizational labels like work, school, personal, client, class, or project in "workspaceLabels"; these labels are not retrieval-scoring concepts.

File metadata:
- Original filename: ${originalName}
- Uploaded source type: ${uploadedType}
- Extracted file kind: ${fileKind}
- Raw storage URL: ${rawStorageUrl}

Existing candidate Knowledge Entries:
${JSON.stringify(candidates, null, 2)}

Extracted text:
${extractedText}`
}
