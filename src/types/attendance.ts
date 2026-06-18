export type CheckInSource = 'qr' | 'manual'

export interface Attendance {
  id: string
  gym_id: string
  client_id: string
  membership_id: string
  checked_in_at: string
  check_in_date: string
  source: CheckInSource
  created_at: string
}

export interface CheckInResult {
  ok: boolean
  code: string
  message: string
  remaining_days?: number
  period?: 'active' | 'grace'
}
