import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useElders } from '../hooks/useElders'

// Routes past this gate assume at least one elder exists. First-time users
// with zero elders are redirected into the 4-step onboarding flow.
export function OnboardingGate() {
  const { elders, loading } = useElders()
  const location = useLocation()

  if (loading) return <div className="min-h-screen bg-bg" />

  if (elders.length === 0 && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
