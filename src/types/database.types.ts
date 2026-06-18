export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in_date: string
          checked_in_at: string
          client_id: string
          created_at: string
          gym_id: string
          id: string
          membership_id: string
          source: string
        }
        Insert: {
          check_in_date: string
          checked_in_at?: string
          client_id: string
          created_at?: string
          gym_id: string
          id?: string
          membership_id: string
          source?: string
        }
        Update: {
          check_in_date?: string
          checked_in_at?: string
          client_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          membership_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birthdate: string | null
          created_at: string
          document_id: string | null
          emergency_contact: string | null
          gym_id: string
          id: string
          notes: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact?: string | null
          gym_id: string
          id?: string
          notes?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact?: string | null
          gym_id?: string
          id?: string
          notes?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          checkin_token: string
          created_at: string
          currency: string
          grace_days: number
          id: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          checkin_token?: string
          created_at?: string
          currency?: string
          grace_days?: number
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          checkin_token?: string
          created_at?: string
          currency?: string
          grace_days?: number
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          client_id: string
          created_at: string
          end_date: string
          grace_days: number
          gym_id: string
          id: string
          plan_id: string | null
          price_cents: number | null
          start_date: string
          status: Database["public"]["Enums"]["membership_status"]
          total_days: number
          updated_at: string
          used_days: number
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date: string
          grace_days?: number
          gym_id: string
          id?: string
          plan_id?: string | null
          price_cents?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["membership_status"]
          total_days: number
          updated_at?: string
          used_days?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string
          grace_days?: number
          gym_id?: string
          id?: string
          plan_id?: string | null
          price_cents?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["membership_status"]
          total_days?: number
          updated_at?: string
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          gym_id: string
          id: string
          membership_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          plan_id: string | null
          receipt_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          gym_id: string
          id?: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          plan_id?: string | null
          receipt_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          plan_id?: string | null
          receipt_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          days: number
          duration_days: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          days: number
          duration_days?: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          days?: number
          duration_days?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gym_id: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gym_id: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gym_id?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_records: {
        Row: {
          bmi: number | null
          client_id: string
          created_at: string
          gym_id: string
          height_cm: number | null
          id: string
          measurements: Json | null
          note: string | null
          recorded_at: string
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          client_id: string
          created_at?: string
          gym_id: string
          height_cm?: number | null
          id?: string
          measurements?: Json | null
          note?: string | null
          recorded_at?: string
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          client_id?: string
          created_at?: string
          gym_id?: string
          height_cm?: number | null
          id?: string
          measurements?: Json | null
          note?: string | null
          recorded_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_payment: {
        Args: {
          p_duration_days?: number
          p_payment_id: string
          p_total_days?: number
        }
        Returns: Json
      }
      current_gym_id: { Args: Record<PropertyKey, never>; Returns: string }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      membership_effective_status: {
        Args: {
          m: Database["public"]["Tables"]["memberships"]["Row"]
          p_today: string
        }
        Returns: Database["public"]["Enums"]["membership_status"]
      }
      process_check_in: { Args: { p_gym_token: string }; Returns: Json }
      reject_payment: {
        Args: { p_note?: string; p_payment_id: string }
        Returns: Json
      }
    }
    Enums: {
      membership_status:
        | "active"
        | "grace"
        | "exhausted"
        | "expired"
        | "cancelled"
      payment_method: "cash" | "transfer" | "nequi" | "daviplata" | "other"
      payment_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      membership_status: ["active", "grace", "exhausted", "expired", "cancelled"],
      payment_method: ["cash", "transfer", "nequi", "daviplata", "other"],
      payment_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "client"],
    },
  },
} as const
