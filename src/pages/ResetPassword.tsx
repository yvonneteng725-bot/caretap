import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'

// Landing page for the password-recovery email. The link carries a PKCE code
// that supabase-js exchanges for a session on load (detectSessionInUrl), so
// by the time the form is used the user has a recovery session and
// updateUser({ password }) works.
export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)
  const updatePassword = useAuthStore((s) => s.updatePassword)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!initialized) {
    return <div className="min-h-screen bg-surface" />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(t('reset_password.mismatch'))
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(
        message.toLowerCase().includes('password should be') ? t('login.error_weak_password') : message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <p className="brand-label text-center text-xs">{t('login.title')}</p>
        <p className="mt-2 text-center text-sm font-light text-text-secondary">{t('reset_password.title')}</p>

        <div className="mt-10 rounded-card bg-surface p-6 shadow-card">
          {!session ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm font-light text-text-primary">{t('reset_password.invalid_link')}</p>
              <Link to="/login" className="text-xs font-light text-text-secondary underline">
                {t('reset_password.request_new')}
              </Link>
            </div>
          ) : done ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm font-light text-text-primary">{t('reset_password.success')}</p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="rounded-full bg-medications-accent py-3 text-sm font-light text-white"
              >
                {t('common.continue')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="password"
                required
                autoFocus
                minLength={6}
                autoComplete="new-password"
                placeholder={t('reset_password.new_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder={t('reset_password.confirm_password')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-full border border-divider bg-bg px-5 py-3 text-sm outline-none"
              />

              {error && (
                <p role="alert" className="text-xs font-light text-blood-pressure-dark">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-medications-accent py-3 text-sm font-light text-white disabled:opacity-60"
              >
                {submitting ? t('common.loading') : t('reset_password.save')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
