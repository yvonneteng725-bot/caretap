import { useTranslation } from 'react-i18next'
import type { Elder } from '../types'

interface Props {
  elders: Elder[]
  onSelect: (elderId: string) => void
}

export function ElderSelector({ elders, onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-surface px-6 py-10">
      <p className="brand-label text-center text-xs">{t('brand')}</p>
      <h1 className="mt-8 text-center text-xl font-light text-text-primary">
        {t('elder_selector.title')}
      </h1>

      <div className="mt-10 flex flex-1 flex-col gap-4">
        {elders.map((elder) => (
          <button
            key={elder.id}
            onClick={() => onSelect(elder.id)}
            className="flex items-center gap-4 rounded-card bg-surface p-4 text-left shadow-card"
          >
            {elder.photo_url ? (
              <img src={elder.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg text-xl font-light text-text-secondary">
                {elder.name.charAt(0)}
              </div>
            )}
            <span className="text-lg font-light text-text-primary">{elder.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
