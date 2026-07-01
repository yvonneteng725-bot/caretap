import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OnboardingGate } from './components/OnboardingGate'
import { AppLayout } from './components/AppLayout'

import Login from './pages/Login'
import Join from './pages/Join'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import LogManual from './pages/LogManual'
import History from './pages/History'
import Settings from './pages/Settings'
import TapHandler from './pages/tap/TapHandler'

function App() {
  const init = useAuthStore((s) => s.init)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    init()
  }, [init])

  if (!initialized) {
    return <div className="min-h-screen bg-bg" />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join/:token" element={<Join />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGate />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/tap/:cardType" element={<TapHandler />} />

            <Route element={<AppLayout />}>
              <Route path="/today" element={<Today />} />
              <Route path="/log" element={<LogManual />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
