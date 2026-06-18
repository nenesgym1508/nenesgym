export type UserRole = 'admin' | 'client'

export interface UserProfile {
  id: string
  gym_id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
}
