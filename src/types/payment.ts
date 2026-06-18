export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'cash' | 'transfer' | 'nequi' | 'daviplata' | 'other'

export interface Payment {
  id: string
  gym_id: string
  client_id: string
  membership_id: string | null
  plan_id: string | null
  amount_cents: number
  method: PaymentMethod
  status: PaymentStatus
  receipt_path: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithClient extends Payment {
  client: {
    id: string
    profile: {
      full_name: string | null
      email: string | null
    }
  }
}

export interface Plan {
  id: string
  gym_id: string
  name: string
  days: number
  duration_days: number
  price_cents: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}
