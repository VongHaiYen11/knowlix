import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/Skeleton'
import { ROUTES } from '@/constants/routes'

const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })))
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((module) => ({ default: module.LibraryPage })))
const ResearchPage = lazy(() => import('@/pages/ResearchPage').then((module) => ({ default: module.ResearchPage })))
const GraphPage = lazy(() => import('@/pages/GraphPage').then((module) => ({ default: module.GraphPage })))
const JournalPage = lazy(() => import('@/pages/JournalPage').then((module) => ({ default: module.JournalPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const KnowledgeArticlePage = lazy(() => import('@/pages/KnowledgeArticlePage').then((module) => ({ default: module.KnowledgeArticlePage })))
const NoteEditorPage = lazy(() => import('@/pages/NoteEditorPage').then((module) => ({ default: module.NoteEditorPage })))

function ShellRoute() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

function KnowledgeRoute() {
  const { slug } = useParams<'slug'>()
  return slug ? <KnowledgeArticlePage slug={slug} /> : <Navigate to={ROUTES.library} replace />
}

function NoteRoute() {
  const { id } = useParams<'id'>()
  return id ? <NoteEditorPage noteId={id} /> : <Navigate to={ROUTES.library} replace />
}

export function App() {
  return (
    <Routes>
      <Route element={<ShellRoute />}>
        <Route index element={<HomePage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="library/knowledge/:slug" element={<KnowledgeRoute />} />
        <Route path="library/note/:id" element={<NoteRoute />} />
        <Route path="research" element={<ResearchPage />} />
        <Route path="graph" element={<GraphPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Route>
    </Routes>
  )
}
