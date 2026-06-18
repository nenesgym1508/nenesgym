export interface Client {
  id: string
  profile_id: string
  gym_id: string
  document_id: string | null
  birthdate: string | null
  emergency_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientWithProfile extends Client {
  profile: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    avatar_url: string | null
  }
}

export interface ClientDashboardData {
  client: ClientWithProfile
  active_membership: import('./membership').MembershipWithStatus | null
  today_checked_in: boolean
  recent_attendance: import('./attendance').Attendance[]
}
