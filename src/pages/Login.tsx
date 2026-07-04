import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/today'

  // Password sign-in resolves in place (no email round-trip), so leave the
  // login page as soon as a session exists. Also covers visiting /login
  // while already signed in.
  const session = useAuthStore((s) => s.session)
  useEffect(() => {
    if (session) navigate(redirect, { replace: true })
  }, [session, navigate, redirect])

  const signInWithMagicLink = useAuthStore((s) => s.signInWithMagicLink)
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword)
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signInWithMagicLink(email, redirect)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      try {
        await signInWithPassword(email, password)
      } catch {
        await signUpWithPassword(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <p className="brand-label text-center text-xs">{t('login.title')}</p>
        <p className="mt-2 text-center text-sm font-light text-text-secondary">{t('login.subtitle')}</p>

        <div className="mt-10 rounded-card bg-surface p-6 shadow-card">
          {sent ? (
            <p className="text-center text-sm font-light text-text-primary">{t('login.check_email')}</p>
          ) : (
            <form onSubmit={usePassword ? handlePassword : handleMagicLink} className="flex flex-col gap-4">
              <input
                type="email"
                required
                autoFocus
                placeholder={t('login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
              />
              {usePassword && (
                <input
                  type="password"
                  required
                  placeholder={t('login.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
                />
              )}

              {error && <p className="text-xs font-light text-blood-pressure-dark">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-medications-accent py-3 text-sm font-light text-white disabled:opacity-60"
              >
                {usePassword ? t('login.sign_in') : t('login.send_link')}
              </button>

              <button
                type="button"
                onClick={() => setUsePassword((v) => !v)}
                className="text-xs font-light text-text-secondary underline"
              >
                {usePassword ? t('login.send_link') : t('login.use_password')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
