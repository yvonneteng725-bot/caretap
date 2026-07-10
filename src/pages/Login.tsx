import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { consumePendingTap } from '../lib/pendingTap'

type Mode = 'sign_in' | 'sign_up' | 'forgot'

// Supabase auth errors arrive as English message strings; translate the
// common ones into friendly copy and fall back to the raw message.
function authErrorKey(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'login.error_invalid_credentials'
  if (m.includes('email not confirmed')) return 'login.error_email_not_confirmed'
  if (m.includes('already registered')) return 'login.error_user_exists'
  if (m.includes('password should be')) return 'login.error_weak_password'
  if (m.includes('rate limit') || m.includes('too many requests')) return 'login.error_rate_limit'
  if (m.includes('unable to validate email') || m.includes('invalid format')) return 'login.error_invalid_email'
  return null
}

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const session = useAuthStore((s) => s.session)
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword)
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword)
  const resetPassword = useAuthStore((s) => s.resetPassword)

  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Once a session exists (sign-in, sign-up without email confirmation, or
  // already logged in), resume a pending NFC tap, honor an explicit
  // ?redirect= (the invite flow), or go home.
  useEffect(() => {
    if (!session) return
    const pendingTap = consumePendingTap()
    if (pendingTap) {
      navigate(`/tap/${pendingTap}`, { replace: true })
      return
    }
    const redirect = searchParams.get('redirect')
    navigate(redirect?.startsWith('/') ? redirect : '/', { replace: true })
  }, [session, navigate, searchParams])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      if (mode === 'sign_in') {
        await signInWithPassword(email, password)
        // Redirect happens in the session effect above.
      } else if (mode === 'sign_up') {
        const { needsEmailConfirmation } = await signUpWithPassword(email, password)
        if (needsEmailConfirmation) setNotice(t('login.confirm_email_sent'))
      } else {
        await resetPassword(email)
        setNotice(t('login.reset_email_sent'))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const key = authErrorKey(message)
      setError(key ? t(key) : message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel =
    mode === 'sign_in' ? t('login.sign_in') : mode === 'sign_up' ? t('login.create_account') : t('login.send_reset_link')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <p className="brand-label text-center text-xs">{t('login.title')}</p>
        <p className="mt-2 text-center text-sm font-light text-text-secondary">{t('login.subtitle')}</p>

        <div className="mt-10 rounded-card bg-surface p-6 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder={t('login.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
            />
            {mode !== 'forgot' && (
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
              />
            )}

            {error && (
              <p role="alert" className="text-xs font-light text-blood-pressure-dark">
                {error}
              </p>
            )}
            {notice && <p className="text-xs font-light text-text-primary">{notice}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-medications-accent py-3 text-sm font-light text-white disabled:opacity-60"
            >
              {submitting ? t('common.loading') : submitLabel}
            </button>

            {mode === 'sign_in' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-light text-text-secondary underline"
                >
                  {t('login.forgot_password')}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('sign_up')}
                  className="text-xs font-light text-text-secondary underline"
                >
                  {t('login.no_account')}
                </button>
              </>
            )}
            {mode !== 'sign_in' && (
              <button
                type="button"
                onClick={() => switchMode('sign_in')}
                className="text-xs font-light text-text-secondary underline"
              >
                {t('login.back_to_sign_in')}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
