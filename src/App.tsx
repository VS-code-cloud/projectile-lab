import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ProtectedRoute } from './components/ProtectedRoute'
import { BrandMark } from './components/BrandMark'
import { ImmersiveBackground } from './components/visual/ImmersiveBackground'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const PracticePage = lazy(() => import('./pages/PracticePage'))
const HighSeasPage = lazy(() => import('./pages/HighSeasPage'))
// Dev-only harness routes for the 3D mini-games (tree-shaken from prod).
const CannonHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/CannonHarness'))
  : null
const MoorStopHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/MoorStopHarness'))
  : null
const JettisonHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/JettisonHarness'))
  : null
const KedgeHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/KedgeHarness'))
  : null
const HeelDeckHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/HeelDeckHarness'))
  : null
const MaelstromHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/MaelstromHarness'))
  : null
const HighSeasHarness = import.meta.env.DEV
  ? lazy(() => import('./pages/HighSeasHarness'))
  : null

/**
 * Wraps the lesson player with a key on the lesson uid so navigating between
 * lessons (same route) remounts it, resetting paging and resume state.
 */
function LessonRoute() {
  const { lessonUid = '' } = useParams()
  return <LessonPage key={lessonUid} />
}

/** Remounts practice when navigating between lesson practice sets. */
function PracticeRoute() {
  const { lessonUid = '' } = useParams()
  return <PracticePage key={lessonUid} />
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
    <ImmersiveBackground contentClassName="flex min-h-svh items-center justify-center px-4">
      <div className="card-glass flex w-full max-w-xs flex-col items-center gap-4 px-6 py-8 sm:max-w-none sm:px-10">
        <BrandMark size={44} className="animate-float" />
        <div className="h-2 w-40 animate-shimmer rounded-full" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    </ImmersiveBackground>
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
          <Route
            path="/lesson/:lessonUid/practice"
            element={
              <PageTransition>
                <ProtectedRoute>
                  <PracticeRoute />
                </ProtectedRoute>
              </PageTransition>
            }
          />
          <Route
            path="/high-seas"
            element={
              <PageTransition>
                <ProtectedRoute>
                  <HighSeasPage />
                </ProtectedRoute>
              </PageTransition>
            }
          />
          {CannonHarness && (
            <Route path="/dev/cannon" element={<CannonHarness />} />
          )}
          {MoorStopHarness && (
            <Route path="/dev/moor-stop" element={<MoorStopHarness />} />
          )}
          {JettisonHarness && (
            <Route path="/dev/jettison" element={<JettisonHarness />} />
          )}
          {KedgeHarness && (
            <Route path="/dev/kedge" element={<KedgeHarness />} />
          )}
          {HeelDeckHarness && (
            <Route path="/dev/heel-deck" element={<HeelDeckHarness />} />
          )}
          {MaelstromHarness && (
            <Route path="/dev/maelstrom" element={<MaelstromHarness />} />
          )}
          {HighSeasHarness && (
            <Route path="/dev/high-seas" element={<HighSeasHarness />} />
          )}
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
