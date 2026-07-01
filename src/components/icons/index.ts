import type { CardType } from '../../types'
import {
  MedicationsIcon,
  BloodPressureIcon,
  TemperatureIcon,
  BloodSugarIcon,
  WoundCareIcon,
  MealLogIcon,
} from './CardIcons'

export const CARD_ICONS: Record<CardType, ({ color }: { color: string }) => JSX.Element> = {
  medications: MedicationsIcon,
  blood_pressure: BloodPressureIcon,
  body_temperature: TemperatureIcon,
  blood_sugar: BloodSugarIcon,
  wound_care: WoundCareIcon,
  meal_log: MealLogIcon,
}

export * from './CardIcons'
