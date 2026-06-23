import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))

/**
 * Application route table. Home and lesson routes require authentication; the
 * login route is public.
 */
export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center text-slate-400">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route
          path="/lesson/:lessonUid"
          element={
            <ProtectedRoute>
              <LessonPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}
