import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { savePendingTap } from '../lib/pendingTap'

export function ProtectedRoute() {
  const { session, initialized } = useAuthStore()
  const location = useLocation()

  if (!initialized) return null

  if (!session) {
    // An NFC tap that arrives logged-out must survive the login round-trip:
    // remember the card type so Login can resume at /tap/:cardType.
    const tapMatch = location.pathname.match(/^\/tap\/([^/]+)/)
    if (tapMatch) savePendingTap(tapMatch[1])
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
