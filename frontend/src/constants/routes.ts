export const ROUTES = {
  home: '/',
  library: '/library',
  research: '/research',
  graph: '/graph',
  journal: '/journal',
  settings: '/settings',
  knowledge: (slug: string) => `/library/knowledge/${slug}`,
  note: (id: string) => `/library/note/${id}`,
} as const
