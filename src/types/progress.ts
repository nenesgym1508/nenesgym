export interface ProgressRecord {
  id: string
  gym_id: string
  client_id: string
  recorded_at: string
  weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  measurements: unknown
  note: string | null
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
