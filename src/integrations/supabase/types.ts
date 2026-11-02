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
      breaches: {
        Row: {
          cause: string
          count: number
          created_at: string
          data: Json
          discovered_at: string
          id: string
          school_id: string
          status: string
          steps: Json
          what: string
        }
        Insert: {
          cause: string
          count?: number
          created_at?: string
          data?: Json
          discovered_at: string
          id: string
          school_id: string
          status?: string
          steps?: Json
          what: string
        }
        Update: {
          cause?: string
          count?: number
          created_at?: string
          data?: Json
          discovered_at?: string
          id?: string
          school_id?: string
          status?: string
          steps?: Json
          what?: string
        }
        Relationships: [
          {
            foreignKeyName: "breaches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_seed: {
        Row: {
          data: Json
          id: number
        }
        Insert: {
          data: Json
          id?: number
        }
        Update: {
          data?: Json
          id?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          at: string
          city: string
          gaps: Json | null
          id: string
          name: string
          phone: string
          role: string
          school: string
          score: number | null
          size: string
        }
        Insert: {
          at?: string
          city?: string
          gaps?: Json | null
          id?: string
          name: string
          phone?: string
          role?: string
          school?: string
          score?: number | null
          size?: string
        }
        Update: {
          at?: string
          city?: string
          gaps?: Json | null
          id?: string
          name?: string
          phone?: string
          role?: string
          school?: string
          score?: number | null
          size?: string
        }
        Relationships: []
      }
      ledger: {
        Row: {
          detail: string
          hash: string
          prev: string
          school_id: string
          seq: number
          sid: string
          ts: string
          type: string
        }
        Insert: {
          detail: string
          hash: string
          prev: string
          school_id: string
          seq: number
          sid: string
          ts: string
          type: string
        }
        Update: {
          detail?: string
          hash?: string
          prev?: string
          school_id?: string
          seq?: number
          sid?: string
          ts?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          done_at: string | null
          id: string
          note: string
          school_id: string
          sid: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          id: string
          note?: string
          school_id: string
          sid: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          id?: string
          note?: string
          school_id?: string
          sid?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_staff: {
        Row: {
          created_at: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          breach_plan: boolean
          city: string
          created_at: string
          dpo: string
          id: string
          is_demo: boolean
          name: string
          notice_version: string
          slug: string
        }
        Insert: {
          breach_plan?: boolean
          city?: string
          created_at?: string
          dpo?: string
          id?: string
          is_demo?: boolean
          name: string
          notice_version?: string
          slug: string
        }
        Update: {
          breach_plan?: boolean
          city?: string
          created_at?: string
          dpo?: string
          id?: string
          is_demo?: boolean
          name?: string
          notice_version?: string
          slug?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          choices: Json
          cls: string
          consent_at: string | null
          created_at: string
          id: string
          lang: string
          name: string
          parent: string
          phone: string
          receipt: string | null
          school_id: string
          sec: string
          sent_at: string | null
          status: string
        }
        Insert: {
          choices?: Json
          cls: string
          consent_at?: string | null
          created_at?: string
          id: string
          lang?: string
          name: string
          parent: string
          phone: string
          receipt?: string | null
          school_id: string
          sec?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          choices?: Json
          cls?: string
          consent_at?: string | null
          created_at?: string
          id?: string
          lang?: string
          name?: string
          parent?: string
          phone?: string
          receipt?: string | null
          school_id?: string
          sec?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          data: Json
          dpa: string
          id: string
          name: string
          review: string | null
          role: string
          school_id: string
          signed_at: string | null
        }
        Insert: {
          data?: Json
          dpa?: string
          id: string
          name: string
          review?: string | null
          role?: string
          school_id: string
          signed_at?: string | null
        }
        Update: {
          data?: Json
          dpa?: string
          id?: string
          name?: string
          review?: string | null
          role?: string
          school_id?: string
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _append: {
        Args: {
          _detail: string
          _school: string
          _sid: string
          _ts?: string
          _type: string
        }
        Returns: {
          detail: string
          hash: string
          prev: string
          school_id: string
          seq: number
          sid: string
          ts: string
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _seed_demo: { Args: never; Returns: undefined }
      append_events: {
        Args: { _events: Json; _school: string }
        Returns: {
          detail: string
          hash: string
          prev: string
          school_id: string
          seq: number
          sid: string
          ts: string
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ledger"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_access: { Args: { _school: string }; Returns: boolean }
      chain_ok: { Args: { _school: string }; Returns: boolean }
      create_school: {
        Args: { _city: string; _dpo: string; _name: string; _slug: string }
        Returns: string
      }
      give_consent: {
        Args: { _newsletter: boolean; _sid: string; _web: boolean }
        Returns: {
          detail: string
          hash: string
          prev: string
          school_id: string
          seq: number
          sid: string
          ts: string
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_students: {
        Args: { _rows: Json; _school: string }
        Returns: number
      }
      iso_now: { Args: never; Returns: string }
      parent_request: {
        Args: { _note: string; _sid: string; _type: string }
        Returns: undefined
      }
      parent_view: { Args: { _sid: string }; Returns: Json }
      reset_demo: { Args: never; Returns: undefined }
      verify_receipt: { Args: { _receipt: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
