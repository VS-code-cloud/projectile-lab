import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { BrandMark } from './BrandMark'

/**
 * Guards routes that require authentication. Renders a loading state while auth
 * resolves and redirects unauthenticated users to the login page.
 * @param props.children Protected subtree to render when authenticated.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5">
        <div className="glow-brand grid h-14 w-14 place-items-center rounded-2xl bg-white">
          <BrandMark size={32} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="h-2.5 w-40 animate-shimmer rounded-full" />
          <span className="text-sm font-medium text-slate-400">Loading…</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
