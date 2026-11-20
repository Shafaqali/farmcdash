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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      animal_health: {
        Row: {
          animal_id: string
          condition: string
          date: string
          details: string
          id: string
          illness_started: string | null
          medicine: string
          recovery: string
          status: string
          temperature_c: number | null
          treatment: string
          user_id: string
        }
        Insert: {
          animal_id: string
          condition: string
          date?: string
          details?: string
          id?: string
          illness_started?: string | null
          medicine?: string
          recovery?: string
          status?: string
          temperature_c?: number | null
          treatment?: string
          user_id?: string
        }
        Update: {
          animal_id?: string
          condition?: string
          date?: string
          details?: string
          id?: string
          illness_started?: string | null
          medicine?: string
          recovery?: string
          status?: string
          temperature_c?: number | null
          treatment?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_health_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          arrival: string
          breed: string
          category_id: string
          created_at: string
          id: string
          monthly_charge: number
          notes: string
          owner_id: string | null
          photo_url: string | null
          sold_date: string | null
          sold_price: number | null
          status: string
          subcategory_id: string | null
          updated_at: string
          user_id: string
          vaccine_due: string | null
        }
        Insert: {
          arrival?: string
          breed?: string
          category_id: string
          created_at?: string
          id: string
          monthly_charge?: number
          notes?: string
          owner_id?: string | null
          photo_url?: string | null
          sold_date?: string | null
          sold_price?: number | null
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
          vaccine_due?: string | null
        }
        Update: {
          arrival?: string
          breed?: string
          category_id?: string
          created_at?: string
          id?: string
          monthly_charge?: number
          notes?: string
          owner_id?: string | null
          photo_url?: string | null
          sold_date?: string | null
          sold_price?: number | null
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
          vaccine_due?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_access: {
        Row: {
          customer_id: string
          owner_id: string
          viewer_id: string
        }
        Insert: {
          customer_id: string
          owner_id: string
          viewer_id: string
        }
        Update: {
          customer_id?: string
          owner_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_background_deliveries: {
        Row: {
          device_id: string
          notice_id: string
        }
        Insert: {
          device_id: string
          notice_id: string
        }
        Update: {
          device_id?: string
          notice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_background_deliveries_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "customer_background_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_background_deliveries_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "customer_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_background_devices: {
        Row: {
          expires_at: string
          id: string
          secret_hash: string
          session_id: string
          viewer_id: string
        }
        Insert: {
          expires_at?: string
          id: string
          secret_hash: string
          session_id: string
          viewer_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          secret_hash?: string
          session_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      customer_invites: {
        Row: {
          customer_id: string
          email: string
          expires_at: string
          owner_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          customer_id: string
          email: string
          expires_at: string
          owner_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          customer_id?: string
          email?: string
          expires_at?: string
          owner_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          animal_id: string | null
          created_at: string
          customer_id: string
          id: string
          kind: string
          message: string
          owner_id: string
          read_at: string | null
          reminder_day: string
          title: string
          viewer_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          kind?: string
          message: string
          owner_id: string
          read_at?: string | null
          reminder_day?: string
          title: string
          viewer_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          kind?: string
          message?: string
          owner_id?: string
          read_at?: string | null
          reminder_day?: string
          title?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          created_at: string
          email: string
          id: string
          login_user_id: string | null
          name: string
          phone: string
          user_id: string
          village: string
        }
        Insert: {
          address?: string
          created_at?: string
          email?: string
          id?: string
          login_user_id?: string | null
          name: string
          phone?: string
          user_id?: string
          village?: string
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          id?: string
          login_user_id?: string | null
          name?: string
          phone?: string
          user_id?: string
          village?: string
        }
        Relationships: []
      }
      login_aliases: {
        Row: {
          alias: string
          display_value: string
          kind: string
          user_id: string
        }
        Insert: {
          alias: string
          display_value: string
          kind: string
          user_id: string
        }
        Update: {
          alias?: string
          display_value?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_aliases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempts: number
          key: string
          started_at: string
        }
        Insert: {
          attempts?: number
          key: string
          started_at?: string
        }
        Update: {
          attempts?: number
          key?: string
          started_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          animal_id: string | null
          created_at: string
          customer_id: string
          date: string
          id: string
          period_start: string | null
          user_id: string
        }
        Insert: {
          amount: number
          animal_id?: string | null
          created_at?: string
          customer_id: string
          date?: string
          id?: string
          period_start?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          animal_id?: string | null
          created_at?: string
          customer_id?: string
          date?: string
          id?: string
          period_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_email: string
          created_at: string
          farm_generation: number
          full_name: string
          id: string
          phone: string
          user_code: string | null
        }
        Insert: {
          contact_email?: string
          created_at?: string
          farm_generation?: number
          full_name?: string
          id: string
          phone?: string
          user_code?: string | null
        }
        Update: {
          contact_email?: string
          created_at?: string
          farm_generation?: number
          full_name?: string
          id?: string
          phone?: string
          user_code?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["farm_account_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["farm_account_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["farm_account_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          animal_id: string
          created_at: string
          date: string
          id: string
          name: string
          next_due: string | null
          user_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          date?: string
          id?: string
          name: string
          next_due?: string | null
          user_id?: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          date?: string
          id?: string
          name?: string
          next_due?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      weights: {
        Row: {
          animal_id: string
          created_at: string
          date: string
          id: string
          kg: number
          user_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          date?: string
          id?: string
          kg: number
          user_id?: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          date?: string
          id?: string
          kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weights_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ack_customer_notifications: {
        Args: { _device: string; _ids: string[]; _secret: string }
        Returns: undefined
      }
      animal_owner_info: {
        Args: { _animal_id: string }
        Returns: {
          owner_name: string
          registered_by: string
          user_code: string
        }[]
      }
      background_device_viewer: {
        Args: { _device: string; _secret: string }
        Returns: string
      }
      can_read_animal_care: { Args: { _animal_id: string }; Returns: boolean }
      can_read_customer_notice: {
        Args: {
          _animal: string
          _customer: string
          _kind: string
          _owner: string
          _viewer: string
        }
        Returns: boolean
      }
      connect_customer: { Args: { _code: string }; Returns: undefined }
      customer_animal_photos: {
        Args: never
        Returns: {
          animal_id: string
          photo_path: string
        }[]
      }
      customer_has_payment_due: {
        Args: { _customer: string; _owner: string }
        Returns: boolean
      }
      customer_portal: { Args: never; Returns: Json }
      delete_owned_animal: { Args: { _animal_id: string }; Returns: undefined }
      delete_owned_customer: {
        Args: { _customer_id: string }
        Returns: undefined
      }
      invite_customer: {
        Args: { _customer_id: string; _email: string }
        Returns: string
      }
      is_farm_owner: { Args: never; Returns: boolean }
      limit_login_attempt: {
        Args: { _key: string; _limit: number }
        Returns: boolean
      }
      owns_animal: { Args: { _animal_id: string }; Returns: boolean }
      poll_customer_notifications: {
        Args: { _device: string; _secret: string }
        Returns: Json
      }
      provision_customer_login: {
        Args: {
          _address?: string
          _customer?: string
          _email?: string
          _login?: string
          _name?: string
          _owner: string
          _phone?: string
          _viewer: string
        }
        Returns: string
      }
      register_background_device: {
        Args: { _device: string; _secret: string }
        Returns: undefined
      }
      remind_unpaid_customers: { Args: never; Returns: number }
      reset_owned_farm: { Args: { _confirmation: string }; Returns: undefined }
      revoke_background_device: {
        Args: { _device: string; _secret: string }
        Returns: undefined
      }
      revoke_customer_access: {
        Args: { _customer_id: string }
        Returns: undefined
      }
      save_login_profile: {
        Args: { _email: string; _login: string; _name: string; _phone: string }
        Returns: undefined
      }
      shared_animal: { Args: { _animal_id: string }; Returns: Json }
    }
    Enums: {
      farm_account_role: "owner" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      farm_account_role: ["owner", "customer"],
    },
  },
} as const
