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
      access_log: {
        Row: {
          action: string
          actor: string
          at: string
          detail: string
          id: number
          role: string
          school_id: string
          sid: string
        }
        Insert: {
          action: string
          actor: string
          at?: string
          detail?: string
          id?: never
          role?: string
          school_id: string
          sid?: string
        }
        Update: {
          action?: string
          actor?: string
          at?: string
          detail?: string
          id?: never
          role?: string
          school_id?: string
          sid?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
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
      group_admins: {
        Row: {
          created_at: string
          group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_admins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          join_code?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          join_code?: string
          name?: string
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
      notices: {
        Row: {
          content: Json
          published_at: string
          published_by: string
          school_id: string
          version: string
        }
        Insert: {
          content: Json
          published_at?: string
          published_by?: string
          school_id: string
          version: string
        }
        Update: {
          content?: Json
          published_at?: string
          published_by?: string
          school_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          sid: string
          used_at: string | null
          void: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          sid: string
          used_at?: string | null
          void?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          sid?: string
          used_at?: string | null
          void?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "otp_codes_sid_fkey"
            columns: ["sid"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked_at: string | null
          school_id: string
          sid: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          expires_at: string
          id: string
          revoked_at?: string | null
          school_id: string
          sid: string
          token_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          school_id?: string
          sid?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "packs_school_id_fkey"
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
          classes: string[]
          created_at: string
          email: string
          name: string
          role: string
          school_id: string
          user_id: string
        }
        Insert: {
          classes?: string[]
          created_at?: string
          email?: string
          name?: string
          role?: string
          school_id: string
          user_id: string
        }
        Update: {
          classes?: string[]
          created_at?: string
          email?: string
          name?: string
          role?: string
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
          digest_email: boolean
          digest_email_to: string
          dpo: string
          group_id: string | null
          id: string
          is_demo: boolean
          languages: string[]
          name: string
          notice_version: string
          slug: string
        }
        Insert: {
          breach_plan?: boolean
          city?: string
          created_at?: string
          digest_email?: boolean
          digest_email_to?: string
          dpo?: string
          group_id?: string | null
          id?: string
          is_demo?: boolean
          languages?: string[]
          name: string
          notice_version?: string
          slug: string
        }
        Update: {
          breach_plan?: boolean
          city?: string
          created_at?: string
          digest_email?: boolean
          digest_email_to?: string
          dpo?: string
          group_id?: string | null
          id?: string
          is_demo?: boolean
          languages?: string[]
          name?: string
          notice_version?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          classes: string[]
          created_at: string
          email: string
          name: string
          role: string
          school_id: string
        }
        Insert: {
          classes?: string[]
          created_at?: string
          email: string
          name?: string
          role: string
          school_id: string
        }
        Update: {
          classes?: string[]
          created_at?: string
          email?: string
          name?: string
          role?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          choices: Json
          cls: string
          consent_at: string | null
          consent_notice: string | null
          created_at: string
          id: string
          lang: string
          name: string
          paper: boolean
          paper_file: string | null
          paper_hash: string | null
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
          consent_notice?: string | null
          created_at?: string
          id: string
          lang?: string
          name: string
          paper?: boolean
          paper_file?: string | null
          paper_hash?: string | null
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
          consent_notice?: string | null
          created_at?: string
          id?: string
          lang?: string
          name?: string
          paper?: boolean
          paper_file?: string | null
          paper_hash?: string | null
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
      _clean_classes: { Args: { _classes: string[] }; Returns: string[] }
      _log: {
        Args: {
          _action: string
          _detail: string
          _school: string
          _sid: string
        }
        Returns: undefined
      }
      _role_label: {
        Args: { _classes: string[]; _role: string }
        Returns: string
      }
      _seed_demo: { Args: never; Returns: undefined }
      _seed_demo_school: {
        Args: {
          _breach: boolean
          _city: string
          _g: string
          _given: number
          _n: number
          _name: string
          _open_req: number
          _overdue: number
          _plan: boolean
          _prefix: string
          _slug: string
        }
        Returns: undefined
      }
      _who: { Args: { _school: string }; Returns: string[] }
      accept_invite: { Args: never; Returns: string }
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
      can_admin: { Args: { _school: string }; Returns: boolean }
      can_group: { Args: { _group: string }; Returns: boolean }
      can_see_cls: { Args: { _cls: string; _school: string }; Returns: boolean }
      can_see_sid: { Args: { _school: string; _sid: string }; Returns: boolean }
      can_write: { Args: { _school: string }; Returns: boolean }
      cancel_invite: {
        Args: { _email: string; _school: string }
        Returns: undefined
      }
      chain_ok: { Args: { _school: string }; Returns: boolean }
      create_group: {
        Args: { _name: string; _school: string }
        Returns: string
      }
      create_pack: { Args: { _school: string; _sid: string }; Returns: Json }
      create_school: {
        Args: { _city: string; _dpo: string; _name: string; _slug: string }
        Returns: string
      }
      give_consent: {
        Args: {
          _code: string
          _newsletter: boolean
          _sid: string
          _web: boolean
        }
        Returns: Json
      }
      group_overview: { Args: { _group: string }; Returns: Json }
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
      invite_staff: {
        Args: {
          _classes: string[]
          _email: string
          _name: string
          _role: string
          _school: string
        }
        Returns: undefined
      }
      iso_now: { Args: never; Returns: string }
      join_group: {
        Args: { _code: string; _school: string }
        Returns: undefined
      }
      log_access: {
        Args: {
          _action: string
          _detail: string
          _school: string
          _sid: string
        }
        Returns: undefined
      }
      my_classes: { Args: { _school: string }; Returns: string[] }
      my_role: { Args: { _school: string }; Returns: string }
      otp_hash: { Args: { _code: string; _sid: string }; Returns: string }
      otp_issue: {
        Args: { _hash: string; _sid: string; _ttl_seconds?: number }
        Returns: Json
      }
      pack_view: { Args: { _token: string }; Returns: Json }
      paper_access: {
        Args: { _name: string; _write: boolean }
        Returns: boolean
      }
      parent_request: {
        Args: { _note: string; _sid: string; _type: string }
        Returns: undefined
      }
      parent_view: { Args: { _sid: string }; Returns: Json }
      public_school: { Args: { _slug: string }; Returns: Json }
      publish_notice: {
        Args: { _content: Json; _school: string }
        Returns: string
      }
      record_paper_consent: {
        Args: {
          _date: string
          _file: string
          _hash: string
          _newsletter: boolean
          _school: string
          _sid: string
          _web: boolean
          _witness: string
        }
        Returns: Json
      }
      remove_staff: {
        Args: { _school: string; _user: string }
        Returns: undefined
      }
      reset_demo: { Args: never; Returns: undefined }
      revoke_pack: {
        Args: { _id: string; _school: string }
        Returns: undefined
      }
      set_digest: {
        Args: { _on: boolean; _school: string; _to: string }
        Returns: undefined
      }
      set_languages: {
        Args: { _langs: string[]; _school: string }
        Returns: undefined
      }
      set_staff_role: {
        Args: {
          _classes: string[]
          _role: string
          _school: string
          _user: string
        }
        Returns: undefined
      }
      start_renewal: {
        Args: { _kind: string; _school: string; _since: string }
        Returns: number
      }
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
