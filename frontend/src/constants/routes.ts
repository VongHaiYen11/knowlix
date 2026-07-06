export const ROUTES = {
  home: '/',
  library: '/library',
  research: '/research',
  graph: '/graph',
  journal: '/journal',
  settings: '/settings',
  knowledge: (slug: string) => `/library/knowledge/${slug}`,
  knowledgeEdit: (slug: string) => `/library/knowledge/${slug}/edit`,
  source: (id: string) => `/library/source/${id}`,
  sourceEdit: (id: string) => `/library/source/${id}/edit`,
  note: (id: string) => `/library/note/${id}`,
} as const
