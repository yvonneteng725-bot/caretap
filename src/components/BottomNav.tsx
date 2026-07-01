import { Home, Plus, TrendingUp, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const TABS = [
  { to: '/today', icon: Home, key: 'today' },
  { to: '/log', icon: Plus, key: 'log' },
  { to: '/history', icon: TrendingUp, key: 'history' },
  { to: '/settings', icon: User, key: 'settings' },
] as const

export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex bg-surface"
      style={{ borderTop: '0.5px solid rgba(200,184,154,0.4)' }}
    >
      {TABS.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-light transition-colors ${
              isActive ? 'text-medications-accent' : 'text-text-secondary'
            }`
          }
        >
          <Icon size={22} strokeWidth={1.5} />
          <span>{t(`nav.${key}`)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
