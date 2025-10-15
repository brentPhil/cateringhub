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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      bookings: {
        Row: {
          assigned_to: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
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
          provider_id: string
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
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
          provider_id: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
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
          provider_id?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
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
        ]
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
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          provider_id: string
          role: Database["public"]["Enums"]["provider_role"]
          status: Database["public"]["Enums"]["provider_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          provider_id: string
          role?: Database["public"]["Enums"]["provider_role"]
          status?: Database["public"]["Enums"]["provider_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          provider_id?: string
          role?: Database["public"]["Enums"]["provider_role"]
          status?: Database["public"]["Enums"]["provider_member_status"]
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
        ]
      }
      provider_role_permissions: {
        Row: {
          created_at: string | null
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          provider_role: Database["public"]["Enums"]["provider_role_type"]
        }
        Insert: {
          created_at?: string | null
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          provider_role: Database["public"]["Enums"]["provider_role_type"]
        }
        Update: {
          created_at?: string | null
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          provider_role?: Database["public"]["Enums"]["provider_role_type"]
        }
        Relationships: []
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
          street_address: string | null
          tagline: string | null
          updated_at: string
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
          street_address?: string | null
          tagline?: string | null
          updated_at?: string
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
          street_address?: string | null
          tagline?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      service_locations: {
        Row: {
          barangay: string | null
          city: string | null
          created_at: string
          id: string
          is_primary: boolean
          landmark: string | null
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
          id?: string
          is_primary?: boolean
          landmark?: string | null
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
          id?: string
          is_primary?: boolean
          landmark?: string | null
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
      user_roles: {
        Row: {
          created_at: string | null
          id: number
          provider_role:
            | Database["public"]["Enums"]["provider_role_type"]
            | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          provider_role?:
            | Database["public"]["Enums"]["provider_role_type"]
            | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          provider_role?:
            | Database["public"]["Enums"]["provider_role_type"]
            | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      debug_jwt_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
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
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { permission_name: Database["public"]["Enums"]["app_permission"] }
        Returns: boolean
      }
      has_provider_role: {
        Args: {
          required_provider_role: Database["public"]["Enums"]["provider_role_type"]
        }
        Returns: boolean
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_provider: {
        Args: Record<PropertyKey, never>
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
      is_provider_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      revoke_all_refresh_tokens: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_permission:
        | "dashboard.access"
        | "users.read"
        | "users.write"
        | "users.delete"
        | "settings.read"
        | "settings.write"
        | "services.create"
        | "services.read"
        | "services.update"
        | "services.delete"
        | "bookings.read"
        | "bookings.update"
        | "calendar.read"
        | "messages.read"
        | "messages.create"
        | "reviews.read"
        | "reviews.respond"
        | "analytics.basic"
      app_role: "user" | "admin" | "catering_provider"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      provider_member_status: "pending" | "active" | "suspended"
      provider_role: "owner" | "admin" | "manager" | "staff" | "viewer"
      provider_role_type: "owner" | "staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permission: [
        "dashboard.access",
        "users.read",
        "users.write",
        "users.delete",
        "settings.read",
        "settings.write",
        "services.create",
        "services.read",
        "services.update",
        "services.delete",
        "bookings.read",
        "bookings.update",
        "calendar.read",
        "messages.read",
        "messages.create",
        "reviews.read",
        "reviews.respond",
        "analytics.basic",
      ],
      app_role: ["user", "admin", "catering_provider"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      provider_member_status: ["pending", "active", "suspended"],
      provider_role: ["owner", "admin", "manager", "staff", "viewer"],
      provider_role_type: ["owner", "staff"],
    },
  },
} as const
