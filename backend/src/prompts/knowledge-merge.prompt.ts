export function getKnowledgeMergePrompt(params: {
  mode: 'automatic' | 'manual'
  targetTitle?: string
  context?: string
  style?: 'balanced' | 'bullet' | 'paragraph' | 'course_notes'
  sources: Array<{
    slug: string
    title: string
    overview: string
    category: string
    tags: string[]
    content: string
  }>
}): string {
  const styleGuide = {
    balanced: 'Use a balanced explanatory article style with clear headings and concise detail.',
    bullet: 'Prefer compact bullet notes with clear grouping and minimal prose.',
    paragraph: 'Prefer flowing paragraphs with fewer bullets unless a list is genuinely clearer.',
    course_notes: 'Write like study notes for a school subject: definitions, key points, examples, and exam-useful structure.',
  }[params.style ?? 'balanced']

  return `You are merging multiple Knowledge pages into one better, more general Knowledge page.
Use only the selected Knowledge pages below. Do not invent new facts, sources, citations, or external context.

Return ONLY valid JSON in this shape:
{
  "title": "Merged Knowledge title",
  "overview": "A short overview of the merged page, at most 4 sentences.",
  "category": "Short category",
  "tags": ["tag-one"],
  "content": "# Merged Knowledge title\\n\\nA cohesive markdown article...",
  "related": [{"slug":"related-slug","title":"Related title"}],
  "reason": "Short explanation of why this merge is useful"
}

Rules:
- Return plain JSON only. No markdown code fences.
- Create one cohesive Knowledge page, not a mechanical concatenation.
- The content must start with exactly one H1 matching the title.
- Preserve useful details from every selected page.
- Remove duplicate explanations and reconcile overlap cleanly.
- Keep the merged Knowledge grounded in the selected pages only.
- Use related only for durable concepts mentioned by the selected pages.

Merge mode: ${params.mode}
Requested title: ${params.targetTitle || 'Let the model choose a concise general title.'}
User context: ${params.mode === 'manual' ? params.context || 'No extra context provided.' : 'Automatic merge.'}
Writing style: ${styleGuide}

Selected Knowledge pages:
${params.sources.map((source, index) => `## Source Knowledge ${index + 1}
Slug: ${source.slug}
Title: ${source.title}
Category: ${source.category}
Tags: ${source.tags.join(', ')}
Overview: ${source.overview}
Markdown:
${source.content}`).join('\n\n---\n\n')}`
}
