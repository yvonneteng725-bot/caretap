import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useElders } from '../../hooks/useElders'
import { useTodayCount } from '../../hooks/useLogs'
import { ElderSelector } from '../../components/ElderSelector'
import { ConfirmationScreen } from '../../components/ConfirmationScreen'
import { MealSelector } from '../../components/MealSelector'
import { VitalInput } from '../../components/VitalInput'
import { PhotoPrompt } from '../../components/PhotoPrompt'
import { createOptimisticLog, persistLog, updateLogField } from '../../lib/logs'
import { checkAlert } from '../../lib/alerts'
import { CARD_TYPE_SLUGS } from '../../types'
import type { CardType, Log } from '../../types'

const NEEDS_INPUT: CardType[] = ['blood_pressure', 'body_temperature', 'blood_sugar', 'meal_log']
const HAS_PHOTO: CardType[] = ['wound_care', 'meal_log']

export default function TapHandler() {
  const { cardType: slug } = useParams<{ cardType: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { elders, loading: eldersLoading, selectElder } = useElders()

  const cardType = slug ? CARD_TYPE_SLUGS[slug] : undefined

  const [chosenElderId, setChosenElderId] = useState<string | null>(null)
  const [log, setLog] = useState<Log | null>(null)
  const [note, setNote] = useState('')
  const noteDebounce = useRef<ReturnType<typeof setTimeout>>()

  const todayCount = useTodayCount(chosenElderId, cardType ?? 'medications', log?.id)

  const alertMessage = useMemo(() => {
    if (!log) return null
    const key = checkAlert(log)
    if (!key) return null
    if (key === 'meal_refused') {
      return t('alerts.meal_refused', { name: elders.find((e) => e.id === chosenElderId)?.name ?? '' })
    }
    return t(`alerts.${key}`)
  }, [log, t, elders, chosenElderId])

  useEffect(() => {
    if (eldersLoading || !elders.length) return
    if (elders.length === 1) {
      setChosenElderId(elders[0].id)
    }
  }, [elders, eldersLoading])

  // Simple card types (medications, wound_care) save instantly — no input step.
  useEffect(() => {
    if (!chosenElderId || !user || !cardType || log) return
    if (NEEDS_INPUT.includes(cardType)) return

    const optimistic = createOptimisticLog(chosenElderId, user.id, cardType)
    setLog(optimistic)
    persistLog(optimistic)
  }, [chosenElderId, user, cardType, log])

  if (!cardType) {
    return <div className="p-6 font-light text-text-primary">Unknown card type</div>
  }

  if (eldersLoading || !user) {
    return <div className="min-h-screen bg-surface" />
  }

  if (elders.length > 1 && !chosenElderId) {
    return (
      <ElderSelector
        elders={elders}
        onSelect={(id) => {
          setChosenElderId(id)
          selectElder(id)
        }}
      />
    )
  }

  if (!chosenElderId) {
    return <div className="min-h-screen bg-surface" />
  }

  const handleSaveWithFields = (fields: Partial<Log>) => {
    const optimistic = { ...createOptimisticLog(chosenElderId, user.id, cardType), ...fields }
    setLog(optimistic)
    persistLog(optimistic)
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
    if (!log) return
    if (noteDebounce.current) clearTimeout(noteDebounce.current)
    noteDebounce.current = setTimeout(() => {
      updateLogField(log.id, { note: value || null })
    }, 600)
  }

  if (!log) {
    if (cardType === 'meal_log') {
      return (
        <MealSelector
          onSave={(intake, hydration) =>
            handleSaveWithFields({ meal_intake: intake, hydration_status: hydration })
          }
        />
      )
    }
    if (cardType === 'blood_pressure') {
      return (
        <VitalInput
          variant="blood_pressure"
          onSave={(v) => handleSaveWithFields(v)}
        />
      )
    }
    if (cardType === 'body_temperature') {
      return (
        <VitalInput
          variant="body_temperature"
          onSave={(v) => handleSaveWithFields(v)}
        />
      )
    }
    if (cardType === 'blood_sugar') {
      return (
        <VitalInput
          variant="blood_sugar"
          onSave={(v) => handleSaveWithFields(v)}
        />
      )
    }
    // medications / wound_care: waiting for the optimistic-save effect above
    return <div className="min-h-screen bg-surface" />
  }

  return (
    <ConfirmationScreen
      cardType={cardType}
      loggedAt={log.logged_at}
      todayCount={todayCount + 1}
      alertMessage={alertMessage}
      note={note}
      onNoteChange={handleNoteChange}
      photoSlot={
        HAS_PHOTO.includes(cardType) ? (
          <PhotoPrompt
            elderId={chosenElderId}
            logId={log.id}
            cardType={cardType as 'wound_care' | 'meal_log'}
          />
        ) : undefined
      }
      onBackHome={() => navigate('/today')}
    />
  )
}
