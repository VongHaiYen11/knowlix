import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source } from '@/types/knowledge'

export const sampleKnowledge: KnowledgeEntry[] = [
  {
    slug: 'spaced-repetition',
    title: 'Spaced Repetition',
    category: 'Learning',
    tags: ['memory', 'study', 'habits'],
    created: 'Jun 24, 2026',
    updated: '2 days ago',
    readTime: '6 min read',
    overview: 'Spaced repetition schedules reviews at increasing intervals, exploiting the spacing effect to move knowledge into long-term memory with minimal effort.',
    keyIdeas: [
      'Memory decays predictably along a forgetting curve; timely review flattens it.',
      'Reviewing just before you forget produces the strongest retention gains.',
      'Difficulty ratings let an algorithm personalize each card interval.',
      'The method trades a little daily discipline for enormous long-term recall.',
    ],
    explanation: [
      'When we learn something new, the memory begins to fade almost immediately. Each successful recall resets and lengthens the curve, so the same fact needs to be revisited less often.',
      'Spaced repetition systems automate this timing. Easy recall pushes the next review into the future; a struggle brings it back soon.',
      'Rather than re-reading everything, you spend attention only on the handful of ideas your mind is about to lose.',
    ],
    examples: [
      { title: 'Language vocabulary', body: 'Learners who review new words with expanding intervals retain far more after a month than those who cram.' },
      { title: 'Medical study', body: 'Anki decks help students hold thousands of facts across years of training.' },
    ],
    related: [
      { slug: 'active-recall', title: 'Active Recall' },
      { slug: 'the-forgetting-curve', title: 'The Forgetting Curve' },
    ],
    references: [
      { label: 'Ebbinghaus, Memory (1885)', source: 'Classic study' },
      { label: 'Make It Stick', source: 'Brown, Roediger & McDaniel' },
    ],
    sources: [
      { id: 's3', type: 'PDF', title: 'Karpicke & Roediger - Retrieval' },
      { id: 's1', type: 'Note', title: 'On the shape of good questions' },
    ],
    timeline: [
      { date: 'Jun 24', event: 'Page drafted from 2 sources' },
      { date: 'Jul 2', event: 'Examples expanded by assistant' },
      { date: 'Jul 4', event: 'Edited overview in your words' },
    ],
  },
  {
    slug: 'active-recall',
    title: 'Active Recall',
    category: 'Learning',
    tags: ['memory', 'study'],
    created: 'Jun 20, 2026',
    updated: '5 days ago',
    readTime: '4 min read',
    overview: 'Active recall is the practice of retrieving information from memory rather than re-reading it. The effort of retrieval itself strengthens the memory.',
    keyIdeas: [
      'Retrieval strengthens memory more than repeated exposure.',
      'The harder the recall, within reason, the greater the benefit.',
      'Testing is not just measurement; it is a form of learning.',
    ],
    explanation: [
      'Familiarity is a poor proxy for knowledge. Active recall flips the process: you close the book and try to reconstruct what you know.',
      'The act of reaching for an answer reconsolidates the memory trace, making it more durable and accessible later.',
    ],
    examples: [{ title: 'The blank page', body: 'After reading a chapter, write everything you remember before checking. The gaps reveal exactly what to review.' }],
    related: [{ slug: 'spaced-repetition', title: 'Spaced Repetition' }],
    references: [{ label: 'Karpicke & Roediger (2008)', source: 'Science' }],
    sources: [{ id: 's3', type: 'PDF', title: 'Karpicke & Roediger - Retrieval' }],
    timeline: [
      { date: 'Jun 20', event: 'Page drafted from 1 source' },
      { date: 'Jul 1', event: 'Linked to Spaced Repetition' },
    ],
  },
  {
    slug: 'the-forgetting-curve',
    title: 'The Forgetting Curve',
    category: 'Cognition',
    tags: ['memory', 'psychology'],
    created: 'Jun 15, 2026',
    updated: '1 week ago',
    readTime: '5 min read',
    overview: 'The forgetting curve describes the exponential loss of memory over time when there is no attempt at retention.',
    keyIdeas: ['Forgetting is fastest immediately after learning.', 'Each review slows subsequent forgetting.', 'Sleep and meaning both flatten the curve.'],
    explanation: [
      'Ebbinghaus found that retention drops sharply within the first hour and continues to decline over days.',
      'Meaningful material, prior knowledge, sleep, and repeated retrieval all slow the decline.',
    ],
    examples: [{ title: 'Lecture recall', body: 'Students forget most of a lecture within a week unless they revisit the material.' }],
    related: [{ slug: 'spaced-repetition', title: 'Spaced Repetition' }],
    references: [{ label: 'Ebbinghaus, Memory (1885)', source: 'Classic study' }],
    sources: [{ id: 's5', type: 'Article', title: 'The Memory Palace and Method of Loci' }],
    timeline: [
      { date: 'Jun 15', event: 'Page drafted from 1 source' },
      { date: 'Jun 29', event: 'Linked to Spaced Repetition' },
    ],
  },
  {
    slug: 'note-taking-systems',
    title: 'Note-Taking Systems',
    category: 'Method',
    tags: ['writing', 'pkm', 'habits'],
    created: 'Jun 28, 2026',
    updated: '3 days ago',
    readTime: '7 min read',
    overview: 'A survey of enduring note-taking methods and the principles that make notes worth keeping: atomicity, linking, and revisiting.',
    keyIdeas: ['Notes gain value when they connect.', 'Atomic notes are easier to reuse.', 'Writing in your own words is where understanding happens.'],
    explanation: [
      'Durable note-taking systems favor small notes, links between ideas, and revisiting over archiving.',
      'Modern tools reproduce backlinks and graph views, but the discipline of writing atomic, linked notes matters more than any software.',
    ],
    examples: [{ title: 'Luhmann Zettelkasten', body: 'Luhmann credited his slip-box with the productivity that produced over 70 books and 400 articles.' }],
    related: [
      { slug: 'active-recall', title: 'Active Recall' },
      { slug: 'personal-knowledge-management', title: 'Personal Knowledge Management' },
    ],
    references: [{ label: 'How to Take Smart Notes', source: 'Sonke Ahrens' }],
    sources: [{ id: 's4', type: 'Bookmark', title: 'A field guide to note-taking systems' }],
    timeline: [
      { date: 'Jun 28', event: 'Page drafted from 1 source' },
      { date: 'Jul 3', event: 'Examples expanded by assistant' },
    ],
  },
  {
    slug: 'personal-knowledge-management',
    title: 'Personal Knowledge Management',
    category: 'Method',
    tags: ['pkm', 'writing', 'attention'],
    created: 'Jul 5, 2026',
    updated: '1 day ago',
    readTime: '5 min read',
    overview: 'Personal knowledge management is the practice of capturing, organizing, and revisiting what you learn so a private archive becomes a thinking partner.',
    keyIdeas: ['Capture is cheap; curation is where value accrues.', 'A good system reduces friction.', 'The archive is a correspondence with your past and future selves.'],
    explanation: [
      'Personal knowledge management builds a loop: capture what resonates, organize and link it, then return when it is useful.',
      'The best systems keep your place, surface the right note, and let meaning be the organizing principle.',
    ],
    examples: [{ title: 'The living archive', body: 'Rereading old notes can feel like meeting a former version of yourself.' }],
    related: [
      { slug: 'note-taking-systems', title: 'Note-Taking Systems' },
      { slug: 'active-recall', title: 'Active Recall' },
    ],
    references: [{ label: 'Building a Second Brain', source: 'Tiago Forte' }],
    sources: [
      { id: 's1', type: 'Note', title: 'On the shape of good questions' },
      { id: 's6', type: 'Image', title: 'Whiteboard sketch - knowledge graph' },
    ],
    timeline: [{ date: 'Jul 5', event: 'Drafted by assistant from 3 notes' }],
  },
]

export const sampleSources: Source[] = [
  { id: 's1', type: 'Note', title: 'On the shape of good questions', tags: ['writing', 'attention'], category: 'Method', created: 'Today, 9:14 AM', status: 'Processed', meta: '342 words', excerpt: 'A good question narrows the search space without predetermining the answer.' },
  { id: 's2', type: 'Voice', title: 'Voice memo - linking journals to knowledge', tags: ['pkm', 'ideas'], category: 'Method', created: '1 hour ago', status: 'Processing', meta: '0:47 recording - transcribing', excerpt: 'What if the journal and the knowledge base were the same substance, viewed at different distances?' },
  { id: 's3', type: 'PDF', title: 'Karpicke & Roediger - The Critical Importance of Retrieval', tags: ['memory', 'study'], category: 'Learning', created: '3 hours ago', status: 'Processed', meta: '8 pages', excerpt: 'Repeated retrieval produced large positive effects on long-term retention compared with repeated study.' },
  { id: 's4', type: 'Bookmark', title: 'A field guide to note-taking systems', tags: ['pkm', 'writing'], category: 'Method', created: 'Yesterday', status: 'Processed', meta: 'notes.andymatuschak.org', excerpt: 'An overview of enduring methods, from the Zettelkasten to progressive summarization.' },
  { id: 's5', type: 'Article', title: 'The Memory Palace and Method of Loci', tags: ['memory', 'psychology'], category: 'Cognition', created: '2 days ago', status: 'Processed', meta: 'longform.org', excerpt: 'A history of spatial memory techniques from ancient orators to modern memory athletes.' },
  { id: 's6', type: 'Image', title: 'Whiteboard sketch - knowledge graph structure', tags: ['pkm', 'ideas'], category: 'Method', created: '2 days ago', status: 'Queued', meta: 'IMG_2048.png', excerpt: 'Hand-drawn diagram of how notes, sources, and pages connect.' },
  { id: 's7', type: 'File', title: 'Reading notes - The Beginning of Infinity.md', tags: ['reading', 'philosophy'], category: 'Cognition', created: '3 days ago', status: 'Processed', meta: 'Markdown - 891 words', excerpt: 'Deutsch argues that explanations, not predictions, are the unit of knowledge.' },
]

export const sampleNoteContent = `# On the shape of good questions

A good question narrows the search space without predetermining the answer. It should feel slightly uncomfortable to hold: open enough to surprise you, precise enough to pull.

## Three qualities

- [x] It survives its first obvious answer.
- [ ] It can be shared without a paragraph of setup.
- [ ] It changes what you notice for the rest of the day.

> [!tip]
> The quality of your attention determines the quality of your questions.

Some inline math: the forgetting rate is $R = e^{-t/S}$, where $S$ is memory strength.

| Method | Effort | Retention |
| --- | --- | --- |
| Re-reading | Low | Low |
| Active recall | Medium | High |
| Spaced repetition | Low/day | Highest |

\`\`\`mermaid
graph LR
  A[Capture] --> B[Organize]
  B --> C[Knowledge]
  C --> D[Review]
  D --> A
\`\`\`
`

export const sampleNotes: NoteItem[] = [
  { id: 'n1', title: 'On the shape of good questions', excerpt: 'A good question narrows the search space without predetermining the answer.', updated: 'Today, 9:14 AM', words: 342, content: sampleNoteContent },
  { id: 'n2', title: 'Reading notes - The Beginning of Infinity', excerpt: 'Deutsch argues that explanations, not predictions, are the unit of knowledge.', updated: 'Yesterday', words: 891, content: '# Reading notes\n\nDeutsch argues that explanations, not predictions, are the unit of knowledge.' },
  { id: 'n3', title: 'Fragments on attention', excerpt: 'Attention is the rarest and purest form of generosity.', updated: '2 days ago', words: 128, content: '# Fragments on attention\n\nAttention is the rarest and purest form of generosity.' },
  { id: 'n4', title: 'Draft - essay on slow software', excerpt: 'Tools that respect your pace instead of demanding it.', updated: '4 days ago', words: 1204, content: '# Draft - essay on slow software\n\nTools that respect your pace instead of demanding it.' },
]

export const sampleJournal: JournalDay[] = [
  {
    date: 'July 6',
    weekday: 'Monday',
    summary: 'A day mostly spent reading about memory. The through-line was retrieval: how the effort of remembering is itself the mechanism of learning.',
    entries: [
      { time: '08:20', kind: 'Thought', text: 'Woke up thinking about why re-reading feels productive but rarely is. Familiarity masquerading as understanding.' },
      { time: '11:05', kind: 'Learning', text: 'Finished the Karpicke paper. The testing effect is larger than I assumed.' },
      { time: '15:40', kind: 'Meeting', text: 'Talked with M about designing calmer software. She used the phrase tools that keep your place for you.' },
    ],
    learnings: ['Retrieval practice beats repeated study across almost every measure.', 'Calm software is largely about respecting the user attention and pace.'],
    connections: ['Connects to Active Recall and The Forgetting Curve.'],
  },
  {
    date: 'July 5',
    weekday: 'Sunday',
    summary: 'Slower day. Long walk, a little writing. Started a draft essay on slow software and captured a voice memo.',
    entries: [
      { time: '10:15', kind: 'Idea', text: 'What if the journal and the knowledge base were the same substance, just viewed at different distances?' },
      { time: '18:30', kind: 'Thought', text: 'Rereading old notes feels like meeting a former version of myself. The archive is a kind of correspondence.' },
    ],
    learnings: ['A private archive is a conversation across time.'],
    connections: ['Informed a new page: Personal Knowledge Management.'],
  },
]

export const graphNodes: GraphNode[] = [
  { id: 'spaced-repetition', label: 'Spaced Repetition', category: 'Learning', tags: ['memory', 'study', 'habits'], x: 0.36, y: 0.34 },
  { id: 'active-recall', label: 'Active Recall', category: 'Learning', tags: ['memory', 'study'], x: 0.62, y: 0.24 },
  { id: 'the-forgetting-curve', label: 'The Forgetting Curve', category: 'Cognition', tags: ['memory', 'psychology'], x: 0.2, y: 0.6 },
  { id: 'note-taking-systems', label: 'Note-Taking Systems', category: 'Method', tags: ['writing', 'pkm', 'habits'], x: 0.68, y: 0.66 },
  { id: 'personal-knowledge-management', label: 'Personal Knowledge Management', category: 'Method', tags: ['pkm', 'writing', 'attention'], x: 0.85, y: 0.44 },
]

export const graphLinks: GraphLink[] = [
  { source: 'spaced-repetition', target: 'active-recall' },
  { source: 'spaced-repetition', target: 'the-forgetting-curve' },
  { source: 'active-recall', target: 'note-taking-systems' },
  { source: 'note-taking-systems', target: 'personal-knowledge-management' },
  { source: 'personal-knowledge-management', target: 'active-recall' },
]

export const allTags = ['memory', 'study', 'habits', 'writing', 'pkm', 'attention', 'psychology', 'ideas', 'reading', 'philosophy']
export const allCategories = ['Learning', 'Cognition', 'Method']
