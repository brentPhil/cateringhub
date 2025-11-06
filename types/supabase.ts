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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          provider_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          provider_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          provider_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_audits: {
        Row: {
          action: string
          actor_id: string | null
          booking_id: string
          created_at: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          assigned_to: string | null
          base_price: number | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          estimated_budget: number | null
          event_date: string
          event_time: string | null
          event_type: string | null
          guest_count: number | null
          id: string
          notes: string | null
          provider_id: string
          service_location_id: string | null
          source: Database["public"]["Enums"]["booking_source"]
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          team_id: string | null
          total_price: number | null
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          base_price?: number | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          estimated_budget?: number | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          provider_id: string
          service_location_id?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          team_id?: string | null
          total_price?: number | null
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          base_price?: number | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          estimated_budget?: number | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          provider_id?: string
          service_location_id?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          team_id?: string | null
          total_price?: number | null
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_location_id_fkey"
            columns: ["service_location_id"]
            isOneToOne: false
            referencedRelation: "service_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          booking_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          provider_id: string
          receipt_url: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          provider_id: string
          receipt_url?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          provider_id?: string
          receipt_url?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: Json | null
          expires_at: string
          ip_address: unknown
          key: string
          result: Json | null
          scope: string
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          expires_at?: string
          ip_address?: unknown
          key: string
          result?: Json | null
          scope: string
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          expires_at?: string
          ip_address?: unknown
          key?: string
          result?: Json | null
          scope?: string
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      provider_gallery_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_gallery_images_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          provider_id: string
          role: Database["public"]["Enums"]["provider_role"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          provider_id: string
          role?: Database["public"]["Enums"]["provider_role"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          provider_id?: string
          role?: Database["public"]["Enums"]["provider_role"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_invitations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_members: {
        Row: {
          created_at: string
          first_login_at: string | null
          id: string
          invitation_method: Database["public"]["Enums"]["invitation_method"]
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          provider_id: string
          role: Database["public"]["Enums"]["provider_role"]
          status: Database["public"]["Enums"]["provider_member_status"]
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_login_at?: string | null
          id?: string
          invitation_method?: Database["public"]["Enums"]["invitation_method"]
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          provider_id: string
          role?: Database["public"]["Enums"]["provider_role"]
          status?: Database["public"]["Enums"]["provider_member_status"]
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_login_at?: string | null
          id?: string
          invitation_method?: Database["public"]["Enums"]["invitation_method"]
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          provider_id?: string
          role?: Database["public"]["Enums"]["provider_role"]
          status?: Database["public"]["Enums"]["provider_member_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_social_links: {
        Row: {
          created_at: string
          id: string
          platform: string
          provider_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          provider_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          provider_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_social_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          advance_booking_days: number | null
          available_days: string[] | null
          banner_adjustments: Json | null
          banner_image: string | null
          barangay: string | null
          business_address: string | null
          business_name: string | null
          city: string | null
          contact_person_name: string | null
          created_at: string
          created_by: string | null
          created_ip: unknown
          daily_capacity: number | null
          description: string | null
          email: string | null
          featured_image_url: string | null
          gallery_images: string[] | null
          id: string
          is_visible: boolean | null
          logo_url: string | null
          max_service_radius: number | null
          mobile_number: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          postal_code: string | null
          province: string | null
          sample_menu_url: string | null
          service_areas: string[] | null
          service_radius: number | null
          social_media_links: Json | null
          street_address: string | null
          tagline: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          advance_booking_days?: number | null
          available_days?: string[] | null
          banner_adjustments?: Json | null
          banner_image?: string | null
          barangay?: string | null
          business_address?: string | null
          business_name?: string | null
          city?: string | null
          contact_person_name?: string | null
          created_at?: string
          created_by?: string | null
          created_ip?: unknown
          daily_capacity?: number | null
          description?: string | null
          email?: string | null
          featured_image_url?: string | null
          gallery_images?: string[] | null
          id?: string
          is_visible?: boolean | null
          logo_url?: string | null
          max_service_radius?: number | null
          mobile_number?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          postal_code?: string | null
          province?: string | null
          sample_menu_url?: string | null
          service_areas?: string[] | null
          service_radius?: number | null
          social_media_links?: Json | null
          street_address?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          advance_booking_days?: number | null
          available_days?: string[] | null
          banner_adjustments?: Json | null
          banner_image?: string | null
          barangay?: string | null
          business_address?: string | null
          business_name?: string | null
          city?: string | null
          contact_person_name?: string | null
          created_at?: string
          created_by?: string | null
          created_ip?: unknown
          daily_capacity?: number | null
          description?: string | null
          email?: string | null
          featured_image_url?: string | null
          gallery_images?: string[] | null
          id?: string
          is_visible?: boolean | null
          logo_url?: string | null
          max_service_radius?: number | null
          mobile_number?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          postal_code?: string | null
          province?: string | null
          sample_menu_url?: string | null
          service_areas?: string[] | null
          service_radius?: number | null
          social_media_links?: Json | null
          street_address?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_locations: {
        Row: {
          barangay: string | null
          city: string | null
          created_at: string
          daily_capacity: number | null
          id: string
          is_primary: boolean
          landmark: string | null
          max_concurrent_events: number | null
          postal_code: string | null
          provider_id: string
          province: string | null
          service_area_notes: string | null
          service_radius: number
          street_address: string | null
          updated_at: string
        }
        Insert: {
          barangay?: string | null
          city?: string | null
          created_at?: string
          daily_capacity?: number | null
          id?: string
          is_primary?: boolean
          landmark?: string | null
          max_concurrent_events?: number | null
          postal_code?: string | null
          provider_id: string
          province?: string | null
          service_area_notes?: string | null
          service_radius?: number
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          barangay?: string | null
          city?: string | null
          created_at?: string
          daily_capacity?: number | null
          id?: string
          is_primary?: boolean
          landmark?: string | null
          max_concurrent_events?: number | null
          postal_code?: string | null
          provider_id?: string
          province?: string | null
          service_area_notes?: string | null
          service_radius?: number
          street_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          booking_id: string
          created_at: string
          id: string
          notes: string | null
          role: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string
          updated_at: string
          user_id: string | null
          worker_profile_id: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          booking_id: string
          created_at?: string
          id?: string
          notes?: string | null
          role?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          worker_profile_id?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          role?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          worker_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_worker_profile_id_fkey"
            columns: ["worker_profile_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          daily_capacity: number | null
          description: string | null
          id: string
          max_concurrent_events: number | null
          name: string
          provider_id: string
          service_location_id: string
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_capacity?: number | null
          description?: string | null
          id?: string
          max_concurrent_events?: number | null
          name: string
          provider_id: string
          service_location_id: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_capacity?: number | null
          description?: string | null
          id?: string
          max_concurrent_events?: number | null
          name?: string
          provider_id?: string
          service_location_id?: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_service_location_id_fkey"
            columns: ["service_location_id"]
            isOneToOne: false
            referencedRelation: "service_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          availability: Json | null
          certifications: string[] | null
          created_at: string
          hourly_rate: number | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          provider_id: string
          role: string | null
          status: Database["public"]["Enums"]["worker_status"]
          tags: string[] | null
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: Json | null
          certifications?: string[] | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          provider_id: string
          role?: string | null
          status?: Database["public"]["Enums"]["worker_status"]
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: Json | null
          certifications?: string[] | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          provider_id?: string
          role?: string | null
          status?: Database["public"]["Enums"]["worker_status"]
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      can_team_accept_booking: {
        Args: { p_event_date: string; p_team_id: string }
        Returns: boolean
      }
      can_view_provider_member: {
        Args: {
          p_provider_id: string
          p_target_team_id: string
          p_target_user_id: string
          p_viewer_id: string
        }
        Returns: boolean
      }
      check_idempotency_key: {
        Args: { p_key: string; p_scope: string; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: number }
      create_manual_booking: {
        Args: {
          p_base_price?: number
          p_customer_email?: string
          p_customer_name: string
          p_customer_phone?: string
          p_estimated_budget?: number
          p_event_date: string
          p_event_time?: string
          p_event_type?: string
          p_guest_count?: number
          p_notes?: string
          p_provider_id: string
          p_service_location_id?: string
          p_special_requests?: string
          p_status?: string
          p_team_id?: string
          p_venue_address?: string
          p_venue_name?: string
        }
        Returns: Json
      }
      create_provider_with_membership: {
        Args: {
          p_business_address?: string
          p_business_name: string
          p_client_ip?: string
          p_contact_person_name: string
          p_description: string
          p_logo_url?: string
          p_mobile_number: string
          p_onboarding_completed?: boolean
          p_onboarding_step?: number
          p_sample_menu_url?: string
          p_service_areas?: string[]
          p_social_links?: Json
          p_user_id: string
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      debug_jwt_claims: { Args: never; Returns: Json }
      get_booking_statistics: {
        Args: {
          p_end_date?: string
          p_provider_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_expense_summary: {
        Args: {
          p_end_date?: string
          p_provider_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_monthly_trend_data: {
        Args: { p_months?: number; p_provider_id: string }
        Returns: Json
      }
      get_revenue_metrics: {
        Args: {
          p_end_date?: string
          p_provider_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_staff_utilization: {
        Args: {
          p_end_date?: string
          p_provider_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_team_capacity_info: {
        Args: { p_event_date: string; p_team_id: string }
        Returns: {
          available_capacity: number
          bookings_on_date: number
          daily_capacity: number
          max_concurrent_events: number
          team_id: string
        }[]
      }
      get_team_for_booking: { Args: { p_booking_id: string }; Returns: string }
      get_user_metadata: {
        Args: { user_id: string }
        Returns: {
          email: string
          id: string
          raw_user_meta_data: Json
        }[]
      }
      get_user_provider_ids: {
        Args: { p_user_id: string }
        Returns: {
          provider_id: string
        }[]
      }
      get_user_teams: {
        Args: { p_provider_id: string; p_user_id: string }
        Returns: string[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_provider: { Args: never; Returns: boolean }
      is_provider_admin: {
        Args: { p_provider_id: string; p_user_id: string }
        Returns: boolean
      }
      is_provider_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["provider_role"]
          p_provider_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      is_provider_owner: { Args: never; Returns: boolean }
      is_team_member:
        | {
            Args: {
              p_provider_id: string
              p_team_id: string
              p_user_id: string
            }
            Returns: boolean
          }
        | { Args: { p_team_id: string; p_user_id: string }; Returns: boolean }
      is_team_member_for_booking: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_supervisor: {
        Args: { p_provider_id: string; p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      mask_pii_in_payload: { Args: { payload: Json }; Returns: Json }
      mask_pii_in_single_record: { Args: { record: Json }; Returns: Json }
      register_idempotency_key: {
        Args: { p_key: string; p_scope: string; p_user_id: string }
        Returns: boolean
      }
      revoke_all_refresh_tokens: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      store_idempotency_result: {
        Args: {
          p_error_details?: Json
          p_key: string
          p_result: Json
          p_scope: string
          p_status?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      booking_source: "auto" | "manual"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      expense_category:
        | "ingredients"
        | "fuel"
        | "equipment_rental"
        | "equipment_purchase"
        | "staff_wages"
        | "staff_overtime"
        | "utilities"
        | "marketing"
        | "supplies"
        | "maintenance"
        | "insurance"
        | "licenses"
        | "other"
      invitation_method: "email_invite" | "admin_created" | "onboarding"
      provider_member_status: "pending" | "active" | "suspended"
      provider_role:
        | "owner"
        | "admin"
        | "manager"
        | "supervisor"
        | "staff"
        | "viewer"
      team_status: "active" | "inactive" | "archived"
      worker_status: "active" | "inactive"
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
      booking_source: ["auto", "manual"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      expense_category: [
        "ingredients",
        "fuel",
        "equipment_rental",
        "equipment_purchase",
        "staff_wages",
        "staff_overtime",
        "utilities",
        "marketing",
        "supplies",
        "maintenance",
        "insurance",
        "licenses",
        "other",
      ],
      invitation_method: ["email_invite", "admin_created", "onboarding"],
      provider_member_status: ["pending", "active", "suspended"],
      provider_role: [
        "owner",
        "admin",
        "manager",
        "supervisor",
        "staff",
        "viewer",
      ],
      team_status: ["active", "inactive", "archived"],
      worker_status: ["active", "inactive"],
    },
  },
} as const
