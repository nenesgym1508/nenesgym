export type MembershipStatus = 'active' | 'grace' | 'exhausted' | 'expired' | 'cancelled'

export interface Membership {
  id: string
  gym_id: string
  client_id: string
  plan_id: string | null
  total_days: number
  used_days: number
  start_date: string
  end_date: string
  grace_days: number
  price_cents: number | null
  status: MembershipStatus
  created_at: string
  updated_at: string
}

export interface MembershipWithStatus extends Membership {
  effective_status: MembershipStatus
  remaining_days: number
  days_until_expiry: number | null
}
