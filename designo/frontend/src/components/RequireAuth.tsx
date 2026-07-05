import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from '../api'

/** Gates the internal studio pages behind the admin session cookie. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const location = useLocation()

  useEffect(() => {
    api.authMe().then((r) => setAuthed(r.authenticated)).catch(() => setAuthed(false))
  }, [location.pathname])

  if (authed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Loading…</p>
      </div>
    )
  }
  if (!authed) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
