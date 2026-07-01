export type Language = 'en' | 'zh-TW' | 'id'

export type UserRole = 'admin' | 'caregiver' | 'family'

export type CardType =
  | 'medications'
  | 'blood_pressure'
  | 'body_temperature'
  | 'blood_sugar'
  | 'wound_care'
  | 'meal_log'

export const CARD_TYPES: CardType[] = [
  'medications',
  'blood_pressure',
  'body_temperature',
  'blood_sugar',
  'wound_care',
  'meal_log',
]

// Maps the /tap/:cardType URL segment to the internal CardType value
export const CARD_TYPE_SLUGS: Record<string, CardType> = {
  medications: 'medications',
  'blood-pressure': 'blood_pressure',
  'body-temperature': 'body_temperature',
  'blood-sugar': 'blood_sugar',
  'wound-care': 'wound_care',
  'meal-log': 'meal_log',
}

export const CARD_TYPE_TO_SLUG: Record<CardType, string> = {
  medications: 'medications',
  blood_pressure: 'blood-pressure',
  body_temperature: 'body-temperature',
  blood_sugar: 'blood-sugar',
  wound_care: 'wound-care',
  meal_log: 'meal-log',
}

export const CARD_ACCENTS: Record<CardType, { accent: string; dark: string }> = {
  medications: { accent: '#7B9E87', dark: '#3D6B58' },
  blood_pressure: { accent: '#B07B7B', dark: '#7A4545' },
  body_temperature: { accent: '#C4956A', dark: '#8A5830' },
  blood_sugar: { accent: '#6B9B9E', dark: '#2E6E72' },
  wound_care: { accent: '#9B8BB4', dark: '#5E4880' },
  meal_log: { accent: '#B8A030', dark: '#7A6A10' },
}

export type MealIntake = 'finished' | 'partial' | 'refused' | 'soft_only' | 'hydration'
export type HydrationStatus = 'good' | 'low' | 'refused'
export type GlucoseTiming = 'before_meal' | 'after_meal' | 'fasting'

export interface Profile {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  preferred_language: Language
  role: UserRole
  created_at: string
}

export interface Elder {
  id: string
  name: string
  date_of_birth: string | null
  photo_url: string | null
  created_by: string | null
  created_at: string
}

export interface ElderAccess {
  id: string
  elder_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Log {
  id: string
  elder_id: string
  logged_by: string
  card_type: CardType
  logged_at: string
  note: string | null

  bp_systolic: number | null
  bp_diastolic: number | null
  bp_pulse: number | null

  temperature_c: number | null

  glucose_mmol: number | null
  glucose_timing: GlucoseTiming | null

  meal_intake: MealIntake | null
  hydration_status: HydrationStatus | null

  photo_url: string | null

  created_at: string

  // client-side joins, not persisted columns
  logged_by_name?: string | null
  alert?: boolean
}

export interface MedicationSchedule {
  id: string
  elder_id: string
  schedule_times: string[]
  active: boolean
  created_at: string
}

export interface PushSubscriptionRow {
  id: string
  user_id: string
  subscription: PushSubscriptionJSON
  created_at: string
}
