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
          session: string
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
          session: string
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
          session?: string
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
      class_block_exercises: {
        Row: {
          block_id: string
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          suggested_weight: string | null
        }
        Insert: {
          block_id: string
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
        }
        Update: {
          block_id?: string
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_block_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "class_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      class_blocks: {
        Row: {
          daily_class_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          daily_class_id: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          daily_class_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_blocks_daily_class_id_fkey"
            columns: ["daily_class_id"]
            isOneToOne: false
            referencedRelation: "daily_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_templates: {
        Row: {
          created_at: string
          estimated_duration_minutes: number | null
          gym_id: string
          id: string
          is_active: boolean
          level: string | null
          name: string
          notes: string | null
          objective: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_duration_minutes?: number | null
          gym_id: string
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          notes?: string | null
          objective?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_duration_minutes?: number | null
          gym_id?: string
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          notes?: string | null
          objective?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_templates_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_routine_blocks: {
        Row: {
          id: string
          position: number
          routine_day_id: string
          title: string
        }
        Insert: {
          id?: string
          position?: number
          routine_day_id: string
          title: string
        }
        Update: {
          id?: string
          position?: number
          routine_day_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_routine_blocks_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "client_routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
      client_routine_days: {
        Row: {
          id: string
          position: number
          routine_id: string
          title: string
          weekday: string | null
        }
        Insert: {
          id?: string
          position?: number
          routine_id: string
          title: string
          weekday?: string | null
        }
        Update: {
          id?: string
          position?: number
          routine_id?: string
          title?: string
          weekday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "client_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      client_routine_exercises: {
        Row: {
          block_id: string
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          suggested_weight: string | null
        }
        Insert: {
          block_id: string
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
        }
        Update: {
          block_id?: string
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_routine_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "client_routine_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      client_routine_sessions: {
        Row: {
          client_id: string
          created_at: string
          gym_id: string
          id: string
          note: string | null
          routine_day_id: string | null
          routine_id: string
          session_date: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          gym_id: string
          id?: string
          note?: string | null
          routine_day_id?: string | null
          routine_id: string
          session_date: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          note?: string | null
          routine_day_id?: string | null
          routine_id?: string
          session_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_routine_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_routine_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_routine_sessions_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "client_routine_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_routine_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "client_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      client_routines: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          created_by_role: string | null
          custom_goal: string | null
          days_per_week: number | null
          description: string | null
          end_date: string | null
          goal: string | null
          gym_id: string
          id: string
          level: string | null
          notes: string | null
          source_id: string | null
          source_type: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          custom_goal?: string | null
          days_per_week?: number | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          gym_id: string
          id?: string
          level?: string | null
          notes?: string | null
          source_id?: string | null
          source_type?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          custom_goal?: string | null
          days_per_week?: number | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          gym_id?: string
          id?: string
          level?: string | null
          notes?: string | null
          source_id?: string | null
          source_type?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_routines_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          auto_aprobacion: boolean
          birthdate: string | null
          comprobante_bloqueado: boolean
          comprobante_bloqueado_hasta: string | null
          created_at: string
          document_id: string | null
          emergency_contact: string | null
          gym_id: string
          id: string
          notes: string | null
          profile_id: string
          strikes_data: Json | null
          updated_at: string
        }
        Insert: {
          auto_aprobacion?: boolean
          birthdate?: string | null
          comprobante_bloqueado?: boolean
          comprobante_bloqueado_hasta?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact?: string | null
          gym_id: string
          id?: string
          notes?: string | null
          profile_id: string
          strikes_data?: Json | null
          updated_at?: string
        }
        Update: {
          auto_aprobacion?: boolean
          birthdate?: string | null
          comprobante_bloqueado?: boolean
          comprobante_bloqueado_hasta?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact?: string | null
          gym_id?: string
          id?: string
          notes?: string | null
          profile_id?: string
          strikes_data?: Json | null
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
      daily_classes: {
        Row: {
          class_date: string
          created_at: string
          created_by: string | null
          estimated_duration_minutes: number | null
          gym_id: string
          id: string
          level: string | null
          notes: string | null
          objective: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          class_date: string
          created_at?: string
          created_by?: string | null
          estimated_duration_minutes?: number | null
          gym_id: string
          id?: string
          level?: string | null
          notes?: string | null
          objective?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          class_date?: string
          created_at?: string
          created_by?: string | null
          estimated_duration_minutes?: number | null
          gym_id?: string
          id?: string
          level?: string | null
          notes?: string | null
          objective?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          equipment: string | null
          exercise_type: string | null
          external_id: string | null
          gym_id: string
          id: string
          instructions: string | null
          is_active: boolean
          media_url: string | null
          muscle_group: string | null
          name: string
          secondary_muscle_groups: string[] | null
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          exercise_type?: string | null
          external_id?: string | null
          gym_id: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          media_url?: string | null
          muscle_group?: string | null
          name: string
          secondary_muscle_groups?: string[] | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment?: string | null
          exercise_type?: string | null
          external_id?: string | null
          gym_id?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          media_url?: string | null
          muscle_group?: string | null
          name?: string
          secondary_muscle_groups?: string[] | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      gyms: {
        Row: {
          checkin_token: string
          created_at: string
          currency: string
          daviplata_number: string | null
          daviplata_titular: string | null
          grace_days: number
          id: string
          logo_url: string | null
          name: string
          nequi_number: string | null
          nequi_titular: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          checkin_token?: string
          created_at?: string
          currency?: string
          daviplata_number?: string | null
          daviplata_titular?: string | null
          grace_days?: number
          id?: string
          logo_url?: string | null
          name: string
          nequi_number?: string | null
          nequi_titular?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          checkin_token?: string
          created_at?: string
          currency?: string
          daviplata_number?: string | null
          daviplata_titular?: string | null
          grace_days?: number
          id?: string
          logo_url?: string | null
          name?: string
          nequi_number?: string | null
          nequi_titular?: string | null
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
          ai_entidad: string | null
          ai_fecha_iso: string | null
          ai_monto: number | null
          ai_nombre: string | null
          ai_numero_destino: string | null
          ai_razon: string | null
          ai_referencia: string | null
          ai_valido: boolean | null
          amount_cents: number
          auto_aprobado: boolean
          client_id: string
          created_at: string
          gym_id: string
          id: string
          imagen_hash: string | null
          imagen_phash: string | null
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
          ai_entidad?: string | null
          ai_fecha_iso?: string | null
          ai_monto?: number | null
          ai_nombre?: string | null
          ai_numero_destino?: string | null
          ai_razon?: string | null
          ai_referencia?: string | null
          ai_valido?: boolean | null
          amount_cents: number
          auto_aprobado?: boolean
          client_id: string
          created_at?: string
          gym_id: string
          id?: string
          imagen_hash?: string | null
          imagen_phash?: string | null
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
          ai_entidad?: string | null
          ai_fecha_iso?: string | null
          ai_monto?: number | null
          ai_nombre?: string | null
          ai_numero_destino?: string | null
          ai_razon?: string | null
          ai_referencia?: string | null
          ai_valido?: boolean | null
          amount_cents?: number
          auto_aprobado?: boolean
          client_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          imagen_hash?: string | null
          imagen_phash?: string | null
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
      progress_goals: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          end_date: string | null
          goal_type: string
          gym_id: string
          id: string
          start_date: string
          status: string
          target_attendance_days: number | null
          target_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          goal_type: string
          gym_id: string
          id?: string
          start_date?: string
          status?: string
          target_attendance_days?: number | null
          target_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          goal_type?: string
          gym_id?: string
          id?: string
          start_date?: string
          status?: string
          target_attendance_days?: number | null
          target_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_goals_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_records: {
        Row: {
          arm_cm: number | null
          bmi: number | null
          chest_cm: number | null
          client_id: string
          created_at: string
          created_by: string
          gym_id: string
          height_cm: number | null
          id: string
          leg_cm: number | null
          measured_date: string
          measurements: Json | null
          note: string | null
          recorded_at: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          bmi?: number | null
          chest_cm?: number | null
          client_id: string
          created_at?: string
          created_by?: string
          gym_id: string
          height_cm?: number | null
          id?: string
          leg_cm?: number | null
          measured_date?: string
          measurements?: Json | null
          note?: string | null
          recorded_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          bmi?: number | null
          chest_cm?: number | null
          client_id?: string
          created_at?: string
          created_by?: string
          gym_id?: string
          height_cm?: number | null
          id?: string
          leg_cm?: number | null
          measured_date?: string
          measurements?: Json | null
          note?: string | null
          recorded_at?: string
          waist_cm?: number | null
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
      receipt_verdicts: {
        Row: {
          client_id: string
          expires_at: string
          id: string
          imagen_hash: string
          veredicto: Json
        }
        Insert: {
          client_id: string
          expires_at?: string
          id?: string
          imagen_hash: string
          veredicto: Json
        }
        Update: {
          client_id?: string
          expires_at?: string
          id?: string
          imagen_hash?: string
          veredicto?: Json
        }
        Relationships: [
          {
            foreignKeyName: "receipt_verdicts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_template_block_exercises: {
        Row: {
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          suggested_weight: string | null
          template_block_id: string
        }
        Insert: {
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
          template_block_id: string
        }
        Update: {
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
          template_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_template_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_template_block_exercises_template_block_id_fkey"
            columns: ["template_block_id"]
            isOneToOne: false
            referencedRelation: "routine_template_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_template_blocks: {
        Row: {
          id: string
          position: number
          template_day_id: string
          title: string
        }
        Insert: {
          id?: string
          position?: number
          template_day_id: string
          title: string
        }
        Update: {
          id?: string
          position?: number
          template_day_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_template_blocks_template_day_id_fkey"
            columns: ["template_day_id"]
            isOneToOne: false
            referencedRelation: "routine_template_days"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_template_days: {
        Row: {
          id: string
          position: number
          template_id: string
          title: string
          weekday: string | null
        }
        Insert: {
          id?: string
          position?: number
          template_id: string
          title: string
          weekday?: string | null
        }
        Update: {
          id?: string
          position?: number
          template_id?: string
          title?: string
          weekday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_template_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          created_at: string
          custom_goal: string | null
          days_per_week: number | null
          description: string | null
          goal: string | null
          gym_id: string
          id: string
          is_active: boolean
          level: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_goal?: string | null
          days_per_week?: number | null
          description?: string | null
          goal?: string | null
          gym_id: string
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_goal?: string | null
          days_per_week?: number | null
          description?: string | null
          goal?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_templates_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      template_block_exercises: {
        Row: {
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          suggested_weight: string | null
          template_block_id: string
        }
        Insert: {
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
          template_block_id: string
        }
        Update: {
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          suggested_weight?: string | null
          template_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_block_exercises_template_block_id_fkey"
            columns: ["template_block_id"]
            isOneToOne: false
            referencedRelation: "template_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      template_blocks: {
        Row: {
          id: string
          position: number
          template_id: string
          title: string
        }
        Insert: {
          id?: string
          position?: number
          template_id: string
          title: string
        }
        Update: {
          id?: string
          position?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_templates"
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
      current_gym_id: { Args: never; Returns: string }
      eligible_days_elapsed: {
        Args: { p_days_per_week: number; p_start: string; p_today: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      membership_status: [
        "active",
        "grace",
        "exhausted",
        "expired",
        "cancelled",
      ],
      payment_method: ["cash", "transfer", "nequi", "daviplata", "other"],
      payment_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "client"],
    },
  },
} as const
