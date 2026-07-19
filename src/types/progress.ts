export interface ProgressRecord {
  id: string
  gym_id: string
  client_id: string
  recorded_at: string
  measured_date: string
  weight_kg: number | null
  height_cm: number | null
  waist_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  leg_cm: number | null
  bmi: number | null
  measurements: unknown
  note: string | null
  created_by: string
  created_at: string
}

export interface ProgressSummary {
  latest: ProgressRecord | null
  previous: ProgressRecord | null
  bmi_category: BmiCategory | null
}

export type BmiCategory =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obese'

export type GoalType =
  | 'gain_muscle'
  | 'lose_fat'
  | 'maintain'

export interface ProgressGoal {
  id: string
  gym_id: string
  client_id: string
  goal_type: GoalType
  target_weight_kg: number | null
  target_attendance_days: number | null
  start_date: string
  end_date: string | null
  status: 'active' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
  updated_at: string
}

export const GOAL_LABELS: Record<GoalType, string> = {
  gain_muscle: 'Ganar masa',
  lose_fat: 'Bajar grasa',
  maintain: 'Mantenerme',
}

// Métricas que cada objetivo prioriza en la pantalla principal de progreso.
// Solo se renderizan las que tengan dato real (ver progreso/page.tsx).
export type ProgressMetricKey =
  | 'weight'
  | 'waist'
  | 'chest'
  | 'arm'
  | 'leg'
  | 'consistency'
  | 'streak'
  | 'last7'
  | 'measurements'

export const GOAL_HIGHLIGHT_METRICS: Record<GoalType, ProgressMetricKey[]> = {
  gain_muscle: ['weight', 'chest', 'arm', 'leg', 'consistency'],
  lose_fat: ['weight', 'waist', 'consistency'],
  maintain: ['weight', 'waist', 'consistency'],
}

// Objetivo por defecto cuando el cliente no ha definido uno.
export const DEFAULT_HIGHLIGHT_METRICS: ProgressMetricKey[] = ['weight', 'consistency']

// Medidas corporales graficables (columna en progress_records).
export type BodyMetricKey = 'weight' | 'waist' | 'chest' | 'arm' | 'leg'

export const BODY_METRIC_LABELS: Record<BodyMetricKey, string> = {
  weight: 'Peso',
  waist: 'Cintura',
  chest: 'Pecho',
  arm: 'Brazo',
  leg: 'Pierna',
}

export const BODY_METRIC_COLUMN: Record<BodyMetricKey, keyof Pick<ProgressRecord, 'weight_kg' | 'waist_cm' | 'chest_cm' | 'arm_cm' | 'leg_cm'>> = {
  weight: 'weight_kg',
  waist: 'waist_cm',
  chest: 'chest_cm',
  arm: 'arm_cm',
  leg: 'leg_cm',
}

export const BODY_METRIC_UNIT: Record<BodyMetricKey, string> = {
  weight: 'kg',
  waist: 'cm',
  chest: 'cm',
  arm: 'cm',
  leg: 'cm',
}
