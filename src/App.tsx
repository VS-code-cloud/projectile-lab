import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ProtectedRoute } from './components/ProtectedRoute'
import { BrandMark } from './components/BrandMark'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))

/**
 * Wraps the lesson player with a key on the lesson uid so navigating between
 * lessons (same route) remounts it, resetting paging and resume state.
 */
function LessonRoute() {
  const { lessonUid = '' } = useParams()
  return <LessonPage key={lessonUid} />
}

/**
 * Quick cross-fade/slide wrapper applied to each routed page so navigation
 * feels continuous. Kept brief (~0.25s); MotionConfig handles reduced motion.
 */
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/** Branded loading state shown while a lazy page chunk is fetched. */
function RouteFallback() {
  return (
    <div className="bg-grid flex min-h-svh items-center justify-center px-4">
      <div className="card-glass flex flex-col items-center gap-4 px-10 py-8">
        <BrandMark size={44} className="animate-float" />
        <div className="h-2 w-40 animate-shimmer rounded-full" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

/**
 * Application route table. Home and lesson routes require authentication; the
 * login route is public. Routes cross-fade on navigation via AnimatePresence,
 * with the Suspense boundary kept outside so lazy loading stays intact.
 */
export default function App() {
  const location = useLocation()
  return (
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              <PageTransition>
                <LoginPage />
              </PageTransition>
            }
          />
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />
          <Route
            path="/lesson/:lessonUid"
            element={
              <PageTransition>
                <ProtectedRoute>
                  <LessonRoute />
                </ProtectedRoute>
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
