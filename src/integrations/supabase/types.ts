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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      documents: {
        Row: {
          content: string | null
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          larp_id: string | null
          priority: number
          run_id: string | null
          sort_order: number | null
          target_group: string | null
          target_person_id: string | null
          target_type: Database["public"]["Enums"]["document_target"]
          title: string
          updated_at: string
          visibility_mode: string
          visible_days_before: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id?: string
          larp_id?: string | null
          priority?: number
          run_id?: string | null
          sort_order?: number | null
          target_group?: string | null
          target_person_id?: string | null
          target_type?: Database["public"]["Enums"]["document_target"]
          title: string
          updated_at?: string
          visibility_mode?: string
          visible_days_before?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          larp_id?: string | null
          priority?: number
          run_id?: string | null
          sort_order?: number | null
          target_group?: string | null
          target_person_id?: string | null
          target_type?: Database["public"]["Enums"]["document_target"]
          title?: string
          updated_at?: string
          visibility_mode?: string
          visible_days_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_documents: {
        Row: {
          created_at: string
          document_id: string
          id: string
          person_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          person_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      larps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          motto: string | null
          name: string
          owner_id: string
          slug: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          motto?: string | null
          name: string
          owner_id: string
          slug: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          motto?: string | null
          name?: string
          owner_id?: string
          slug?: string
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          access_token: string
          created_at: string
          group_name: string | null
          id: string
          larp_id: string | null
          medailonek: string | null
          name: string
          paid_at: string | null
          password_hash: string
          performance_times: string | null
          performer: string | null
          run_id: string | null
          slug: string
          type: Database["public"]["Enums"]["person_type"]
          updated_at: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          group_name?: string | null
          id?: string
          larp_id?: string | null
          medailonek?: string | null
          name: string
          paid_at?: string | null
          password_hash: string
          performance_times?: string | null
          performer?: string | null
          run_id?: string | null
          slug: string
          type: Database["public"]["Enums"]["person_type"]
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          group_name?: string | null
          id?: string
          larp_id?: string | null
          medailonek?: string | null
          name?: string
          paid_at?: string | null
          password_hash?: string
          performance_times?: string | null
          performer?: string | null
          run_id?: string | null
          slug?: string
          type?: Database["public"]["Enums"]["person_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_feedback: {
        Row: {
          content: string
          created_at: string
          id: string
          larp_id: string | null
          resolved_at: string | null
          source_page: string
          status: Database["public"]["Enums"]["feedback_status"]
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          larp_id?: string | null
          resolved_at?: string | null
          source_page: string
          status?: Database["public"]["Enums"]["feedback_status"]
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          larp_id?: string | null
          resolved_at?: string | null
          source_page?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_feedback_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
        ]
      }
      printables: {
        Row: {
          created_at: string
          id: string
          larp_id: string | null
          print_instructions: string | null
          run_id: string
          sort_order: number | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          larp_id?: string | null
          print_instructions?: string | null
          run_id: string
          sort_order?: number | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          larp_id?: string | null
          print_instructions?: string | null
          run_id?: string
          sort_order?: number | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printables_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printables_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_links: {
        Row: {
          created_at: string
          description: string | null
          id: string
          larp_id: string | null
          link_type: string | null
          run_id: string
          sort_order: number | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          larp_id?: string | null
          link_type?: string | null
          run_id: string
          sort_order?: number | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          larp_id?: string | null
          link_type?: string | null
          run_id?: string
          sort_order?: number | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_links_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_links_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_person_assignments: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          paid_at: string | null
          password_hash: string
          person_id: string
          player_email: string | null
          player_name: string | null
          player_phone: string | null
          run_id: string
          updated_at: string | null
        }
        Insert: {
          access_token?: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          password_hash: string
          person_id: string
          player_email?: string | null
          player_name?: string | null
          player_phone?: string | null
          run_id: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          password_hash?: string
          person_id?: string
          player_email?: string | null
          player_name?: string | null
          player_phone?: string | null
          run_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_person_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_person_assignments_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          footer_text: string | null
          id: string
          is_active: boolean | null
          larp_id: string
          location: string | null
          mission_briefing: string | null
          name: string
          payment_account: string | null
          payment_amount: string | null
          payment_due_date: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          larp_id: string
          location?: string | null
          mission_briefing?: string | null
          name: string
          payment_account?: string | null
          payment_amount?: string | null
          payment_due_date?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          larp_id?: string
          location?: string | null
          mission_briefing?: string | null
          name?: string
          payment_account?: string | null
          payment_amount?: string | null
          payment_due_date?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          cp_id: string | null
          created_at: string
          day_number: number
          description: string | null
          duration_minutes: number
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          run_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          cp_id?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          duration_minutes?: number
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          run_id: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          cp_id?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          duration_minutes?: number
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          run_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_cp_id_fkey"
            columns: ["cp_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_person_assignment_with_password: {
        Args: {
          p_password: string
          p_person_id: string
          p_player_email?: string
          p_player_name?: string
          p_run_id: string
        }
        Returns: string
      }
      create_person_with_password: {
        Args: {
          p_group_name?: string
          p_larp_id: string
          p_name: string
          p_password: string
          p_performance_times?: string
          p_performer?: string
          p_slug: string
          p_type: Database["public"]["Enums"]["person_type"]
        }
        Returns: string
      }
      get_person_documents: {
        Args: { p_person_id: string }
        Returns: {
          content: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          priority: number
          sort_order: number
          target_type: Database["public"]["Enums"]["document_target"]
          title: string
        }[]
      }
      get_run_schedule: {
        Args: { p_run_id: string }
        Returns: {
          cp_name: string
          day_number: number
          description: string
          duration_minutes: number
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string
          start_time: string
          title: string
        }[]
      }
      is_larp_owner: { Args: { larp_id: string }; Returns: boolean }
      is_run_owner: { Args: { run_id: string }; Returns: boolean }
      verify_person_access: {
        Args: { p_access_token: string; p_password: string }
        Returns: {
          group_name: string
          larp_name: string
          larp_theme: string
          mission_briefing: string
          performance_times: string
          performer: string
          person_id: string
          person_name: string
          person_paid_at: string
          person_type: Database["public"]["Enums"]["person_type"]
          run_contact: string
          run_footer_text: string
          run_id: string
          run_name: string
          run_payment_account: string
          run_payment_amount: string
          run_payment_due_date: string
        }[]
      }
      verify_person_by_slug: {
        Args: { p_password: string; p_slug: string }
        Returns: {
          group_name: string
          larp_id: string
          larp_motto: string
          larp_name: string
          larp_theme: string
          mission_briefing: string
          performance_times: string
          performer: string
          person_id: string
          person_medailonek: string
          person_name: string
          person_paid_at: string
          person_type: Database["public"]["Enums"]["person_type"]
          run_address: string
          run_contact: string
          run_date_from: string
          run_date_to: string
          run_footer_text: string
          run_id: string
          run_location: string
          run_name: string
          run_payment_account: string
          run_payment_amount: string
          run_payment_due_date: string
        }[]
      }
    }
    Enums: {
      document_target: "vsichni" | "skupina" | "osoba"
      document_type: "organizacni" | "herni" | "postava" | "medailonek" | "cp"
      event_type:
        | "programovy_blok"
        | "jidlo"
        | "presun"
        | "informace"
        | "vystoupeni_cp"
      feedback_status: "new" | "read" | "resolved"
      person_type: "postava" | "cp"
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
      document_target: ["vsichni", "skupina", "osoba"],
      document_type: ["organizacni", "herni", "postava", "medailonek", "cp"],
      event_type: [
        "programovy_blok",
        "jidlo",
        "presun",
        "informace",
        "vystoupeni_cp",
      ],
      feedback_status: ["new", "read", "resolved"],
      person_type: ["postava", "cp"],
    },
  },
} as const
