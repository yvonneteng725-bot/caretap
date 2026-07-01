import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import type { Language } from '../types'

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  'zh-TW': '中文',
  id: 'Bahasa Indonesia',
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const updateLanguage = useAuthStore((s) => s.updateLanguage)

  const handleChange = async (lang: Language) => {
    await i18n.changeLanguage(lang)
    await updateLanguage(lang)
  }

  return (
    <div className="flex gap-2">
      {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => handleChange(lang)}
          className={`flex-1 rounded-full py-2.5 text-sm font-light transition-colors ${
            i18n.language === lang
              ? 'bg-medications-accent text-white'
              : 'bg-bg text-text-secondary'
          }`}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  )
}
