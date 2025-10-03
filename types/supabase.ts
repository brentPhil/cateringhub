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
      catering_providers: {
        Row: {
          banner_adjustments: Json | null
          banner_image: string | null
          business_address: string | null
          business_name: string
          contact_person_name: string
          created_at: string | null
          description: string
          id: string
          logo_url: string | null
          mobile_number: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          sample_menu_url: string | null
          service_areas: string[]
          social_media_links: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          banner_adjustments?: Json | null
          banner_image?: string | null
          business_address?: string | null
          business_name: string
          contact_person_name: string
          created_at?: string | null
          description: string
          id?: string
          logo_url?: string | null
          mobile_number: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          sample_menu_url?: string | null
          service_areas?: string[]
          social_media_links?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          banner_adjustments?: Json | null
          banner_image?: string | null
          business_address?: string | null
          business_name?: string
          contact_person_name?: string
          created_at?: string | null
          description?: string
          id?: string
          logo_url?: string | null
          mobile_number?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          sample_menu_url?: string | null
          service_areas?: string[]
          social_media_links?: Json | null
          updated_at?: string | null
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
      provider_role_type: ["owner", "staff"],
    },
  },
} as const
