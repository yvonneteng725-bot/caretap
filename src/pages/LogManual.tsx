import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CARD_TYPES, CARD_ACCENTS, CARD_TYPE_TO_SLUG } from '../types'
import { CARD_ICONS } from '../components/icons'
import { hexToRgba } from '../lib/color'

export default function LogManual() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg px-4 pb-8 pt-8">
      <p className="brand-label px-2 text-xs">{t('brand')}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CARD_TYPES.map((cardType) => {
          const accent = CARD_ACCENTS[cardType]
          const Icon = CARD_ICONS[cardType]
          return (
            <button
              key={cardType}
              onClick={() => navigate(`/tap/${CARD_TYPE_TO_SLUG[cardType]}`)}
              className="flex flex-col overflow-hidden rounded-card shadow-card"
              style={{ width: '100%', maxWidth: '177px', height: '220px' }}
            >
              <div className="flex flex-[3] items-center justify-center bg-surface">
                <Icon color={accent.accent} />
              </div>
              <div
                className="flex flex-[2] items-center justify-center px-2 text-center text-sm font-light"
                style={{ backgroundColor: hexToRgba(accent.accent, 0.18), color: accent.dark }}
              >
                {t(`card_types.${cardType}`)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
