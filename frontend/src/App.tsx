import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/Skeleton'
import { ROUTES } from '@/constants/routes'

const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })))
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((module) => ({ default: module.LibraryPage })))
const ResearchPage = lazy(() => import('@/pages/ResearchPage').then((module) => ({ default: module.ResearchPage })))
const CustomizationPage = lazy(() => import('@/pages/CustomizationPage').then((module) => ({ default: module.CustomizationPage })))
const JournalPage = lazy(() => import('@/pages/JournalPage').then((module) => ({ default: module.JournalPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const KnowledgeArticlePage = lazy(() => import('@/pages/KnowledgeArticlePage').then((module) => ({ default: module.KnowledgeArticlePage })))
const SourceArticlePage = lazy(() => import('@/pages/SourceArticlePage').then((module) => ({ default: module.SourceArticlePage })))
const LibraryContentEditorPage = lazy(() => import('@/pages/LibraryContentEditorPage').then((module) => ({ default: module.LibraryContentEditorPage })))
const NoteEditorPage = lazy(() => import('@/pages/NoteEditorPage').then((module) => ({ default: module.NoteEditorPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('@/pages/SignupPage').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))

function LoadingScreen() {
  return <div className="p-6"><Skeleton className="h-96" /></div>
}

function ShellRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to={ROUTES.login} replace />
  return (
    <AppShell>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

function AuthRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to={ROUTES.home} replace />
  return <Suspense fallback={<LoadingScreen />}><Outlet /></Suspense>
}

function KnowledgeRoute() {
  const { slug } = useParams<'slug'>()
  return slug ? <KnowledgeArticlePage slug={slug} /> : <Navigate to={ROUTES.library} replace />
}

function KnowledgeEditRoute() {
  const { slug } = useParams<'slug'>()
  return slug ? <LibraryContentEditorPage id={slug} kind="knowledge" /> : <Navigate to={ROUTES.library} replace />
}

function SourceRoute() {
  const { id } = useParams<'id'>()
  return id ? <SourceArticlePage id={id} /> : <Navigate to={ROUTES.library} replace />
}

function SourceEditRoute() {
  const { id } = useParams<'id'>()
  return id ? <LibraryContentEditorPage id={id} kind="source" /> : <Navigate to={ROUTES.library} replace />
}

function NoteRoute() {
  const { id } = useParams<'id'>()
  return id ? <NoteEditorPage noteId={id} /> : <Navigate to={ROUTES.library} replace />
}

export function App() {
  return (
    <Routes>
      <Route element={<AuthRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ShellRoute />}>
        <Route index element={<HomePage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="library/knowledge/:slug" element={<KnowledgeRoute />} />
        <Route path="library/knowledge/:slug/edit" element={<KnowledgeEditRoute />} />
        <Route path="library/source/:id" element={<SourceRoute />} />
        <Route path="library/source/:id/edit" element={<SourceEditRoute />} />
        <Route path="library/note/:id" element={<NoteRoute />} />
        <Route path="research" element={<ResearchPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="customization" element={<CustomizationPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Route>
    </Routes>
  )
}
