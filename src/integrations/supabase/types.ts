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
      cp_performers: {
        Row: {
          cp_id: string
          created_at: string
          id: string
          performer_email: string | null
          performer_name: string
          performer_phone: string | null
          run_id: string
        }
        Insert: {
          cp_id: string
          created_at?: string
          id?: string
          performer_email?: string | null
          performer_name: string
          performer_phone?: string | null
          run_id: string
        }
        Update: {
          cp_id?: string
          created_at?: string
          id?: string
          performer_email?: string | null
          performer_name?: string
          performer_phone?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_performers_cp_id_fkey"
            columns: ["cp_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_performers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_scenes: {
        Row: {
          cp_id: string
          created_at: string
          day_number: number
          description: string | null
          duration_minutes: number
          id: string
          is_preherni: boolean
          larp_id: string
          location: string | null
          props: string | null
          schedule_event_id: string | null
          sort_order: number | null
          start_time: string
          title: string | null
          updated_at: string
        }
        Insert: {
          cp_id: string
          created_at?: string
          day_number?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_preherni?: boolean
          larp_id: string
          location?: string | null
          props?: string | null
          schedule_event_id?: string | null
          sort_order?: number | null
          start_time: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          cp_id?: string
          created_at?: string
          day_number?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_preherni?: boolean
          larp_id?: string
          location?: string | null
          props?: string | null
          schedule_event_id?: string | null
          sort_order?: number | null
          start_time?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_scenes_cp_id_fkey"
            columns: ["cp_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_scenes_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_scenes_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_scenes_backup_v1: {
        Row: {
          cp_id: string | null
          created_at: string | null
          day_number: number | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          is_preherni: boolean | null
          location: string | null
          props: string | null
          run_id: string | null
          schedule_event_id: string | null
          sort_order: number | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cp_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_preherni?: boolean | null
          location?: string | null
          props?: string | null
          run_id?: string | null
          schedule_event_id?: string | null
          sort_order?: number | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cp_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_preherni?: boolean | null
          location?: string | null
          props?: string | null
          run_id?: string | null
          schedule_event_id?: string | null
          sort_order?: number | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cp_scenes_backup_v2: {
        Row: {
          cp_id: string | null
          created_at: string | null
          day_number: number | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          is_preherni: boolean | null
          location: string | null
          props: string | null
          run_id: string | null
          schedule_event_id: string | null
          sort_order: number | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cp_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_preherni?: boolean | null
          location?: string | null
          props?: string | null
          run_id?: string | null
          schedule_event_id?: string | null
          sort_order?: number | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cp_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_preherni?: boolean | null
          location?: string | null
          props?: string | null
          run_id?: string | null
          schedule_event_id?: string | null
          sort_order?: number | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_views: {
        Row: {
          document_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          person_id: string
          run_id: string | null
          view_count: number
        }
        Insert: {
          document_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          person_id: string
          run_id?: string | null
          view_count?: number
        }
        Update: {
          document_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          person_id?: string
          run_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_views_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_views_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_views_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          audience: string[]
          content: string | null
          created_at: string
          doc_category: Database["public"]["Enums"]["doc_category"]
          doc_type: Database["public"]["Enums"]["document_type"]
          extra_target_group_names: string[]
          extra_target_person_ids: string[]
          id: string
          is_personal: boolean
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
          visible_to_cp: boolean
        }
        Insert: {
          audience?: string[]
          content?: string | null
          created_at?: string
          doc_category: Database["public"]["Enums"]["doc_category"]
          doc_type: Database["public"]["Enums"]["document_type"]
          extra_target_group_names?: string[]
          extra_target_person_ids?: string[]
          id?: string
          is_personal?: boolean
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
          visible_to_cp?: boolean
        }
        Update: {
          audience?: string[]
          content?: string | null
          created_at?: string
          doc_category?: Database["public"]["Enums"]["doc_category"]
          doc_type?: Database["public"]["Enums"]["document_type"]
          extra_target_group_names?: string[]
          extra_target_person_ids?: string[]
          id?: string
          is_personal?: boolean
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
          visible_to_cp?: boolean
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
      documents_backup_v1: {
        Row: {
          content: string | null
          created_at: string | null
          doc_type: Database["public"]["Enums"]["document_type"] | null
          id: string | null
          larp_id: string | null
          priority: number | null
          run_id: string | null
          sort_order: number | null
          target_group: string | null
          target_person_id: string | null
          target_type: Database["public"]["Enums"]["document_target"] | null
          title: string | null
          updated_at: string | null
          visibility_mode: string | null
          visible_days_before: number | null
          visible_to_cp: boolean | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string | null
          larp_id?: string | null
          priority?: number | null
          run_id?: string | null
          sort_order?: number | null
          target_group?: string | null
          target_person_id?: string | null
          target_type?: Database["public"]["Enums"]["document_target"] | null
          title?: string | null
          updated_at?: string | null
          visibility_mode?: string | null
          visible_days_before?: number | null
          visible_to_cp?: boolean | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string | null
          larp_id?: string | null
          priority?: number | null
          run_id?: string | null
          sort_order?: number | null
          target_group?: string | null
          target_person_id?: string | null
          target_type?: Database["public"]["Enums"]["document_target"] | null
          title?: string | null
          updated_at?: string | null
          visibility_mode?: string | null
          visible_days_before?: number | null
          visible_to_cp?: boolean | null
        }
        Relationships: []
      }
      email_log_v2: {
        Row: {
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          larp_id: string
          metadata: Json
          person_id: string | null
          recipient_email: string
          run_id: string | null
          status: string
          subject: string | null
          template_kind: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          larp_id: string
          metadata?: Json
          person_id?: string | null
          recipient_email: string
          run_id?: string | null
          status?: string
          subject?: string | null
          template_kind: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          larp_id?: string
          metadata?: Json
          person_id?: string | null
          recipient_email?: string
          run_id?: string | null
          status?: string
          subject?: string | null
          template_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_v2_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_v2_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_v2_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          kind: string
          larp_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          kind: string
          larp_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          kind?: string
          larp_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      hidden_document_groups: {
        Row: {
          created_at: string
          document_id: string
          group_name: string
          id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          group_name: string
          id?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          group_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_document_groups_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
      larp_design_settings: {
        Row: {
          accent_color: string | null
          accent_foreground: string | null
          background_color: string | null
          border_color: string | null
          button_radius: string | null
          card_color: string | null
          card_foreground: string | null
          created_at: string
          custom_css: string | null
          destructive_color: string | null
          destructive_foreground: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          foreground_color: string | null
          h1_font_size: string | null
          h1_font_weight: string | null
          h1_letter_spacing: string | null
          h1_line_height: string | null
          h1_margin_bottom: string | null
          h2_font_size: string | null
          h2_font_weight: string | null
          h2_letter_spacing: string | null
          h2_line_height: string | null
          h2_margin_bottom: string | null
          h3_font_size: string | null
          h3_font_weight: string | null
          h3_letter_spacing: string | null
          h3_line_height: string | null
          h3_margin_bottom: string | null
          h4_font_size: string | null
          h4_font_weight: string | null
          h4_letter_spacing: string | null
          h4_line_height: string | null
          h4_margin_bottom: string | null
          h5_font_size: string | null
          h5_font_weight: string | null
          h5_letter_spacing: string | null
          h5_line_height: string | null
          h5_margin_bottom: string | null
          id: string
          larp_id: string
          logo_url: string | null
          muted_color: string | null
          muted_foreground: string | null
          primary_color: string | null
          primary_foreground: string | null
          secondary_color: string | null
          secondary_foreground: string | null
          sidebar_background: string | null
          sidebar_foreground: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          accent_foreground?: string | null
          background_color?: string | null
          border_color?: string | null
          button_radius?: string | null
          card_color?: string | null
          card_foreground?: string | null
          created_at?: string
          custom_css?: string | null
          destructive_color?: string | null
          destructive_foreground?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          foreground_color?: string | null
          h1_font_size?: string | null
          h1_font_weight?: string | null
          h1_letter_spacing?: string | null
          h1_line_height?: string | null
          h1_margin_bottom?: string | null
          h2_font_size?: string | null
          h2_font_weight?: string | null
          h2_letter_spacing?: string | null
          h2_line_height?: string | null
          h2_margin_bottom?: string | null
          h3_font_size?: string | null
          h3_font_weight?: string | null
          h3_letter_spacing?: string | null
          h3_line_height?: string | null
          h3_margin_bottom?: string | null
          h4_font_size?: string | null
          h4_font_weight?: string | null
          h4_letter_spacing?: string | null
          h4_line_height?: string | null
          h4_margin_bottom?: string | null
          h5_font_size?: string | null
          h5_font_weight?: string | null
          h5_letter_spacing?: string | null
          h5_line_height?: string | null
          h5_margin_bottom?: string | null
          id?: string
          larp_id: string
          logo_url?: string | null
          muted_color?: string | null
          muted_foreground?: string | null
          primary_color?: string | null
          primary_foreground?: string | null
          secondary_color?: string | null
          secondary_foreground?: string | null
          sidebar_background?: string | null
          sidebar_foreground?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          accent_foreground?: string | null
          background_color?: string | null
          border_color?: string | null
          button_radius?: string | null
          card_color?: string | null
          card_foreground?: string | null
          created_at?: string
          custom_css?: string | null
          destructive_color?: string | null
          destructive_foreground?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          foreground_color?: string | null
          h1_font_size?: string | null
          h1_font_weight?: string | null
          h1_letter_spacing?: string | null
          h1_line_height?: string | null
          h1_margin_bottom?: string | null
          h2_font_size?: string | null
          h2_font_weight?: string | null
          h2_letter_spacing?: string | null
          h2_line_height?: string | null
          h2_margin_bottom?: string | null
          h3_font_size?: string | null
          h3_font_weight?: string | null
          h3_letter_spacing?: string | null
          h3_line_height?: string | null
          h3_margin_bottom?: string | null
          h4_font_size?: string | null
          h4_font_weight?: string | null
          h4_letter_spacing?: string | null
          h4_line_height?: string | null
          h4_margin_bottom?: string | null
          h5_font_size?: string | null
          h5_font_weight?: string | null
          h5_letter_spacing?: string | null
          h5_line_height?: string | null
          h5_margin_bottom?: string | null
          id?: string
          larp_id?: string
          logo_url?: string | null
          muted_color?: string | null
          muted_foreground?: string | null
          primary_color?: string | null
          primary_foreground?: string | null
          secondary_color?: string | null
          secondary_foreground?: string | null
          sidebar_background?: string | null
          sidebar_foreground?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "larp_design_settings_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: true
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
        ]
      }
      larp_email_config: {
        Row: {
          created_at: string
          larp_id: string
          reply_to: string | null
          sender_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          larp_id: string
          reply_to?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          larp_id?: string
          reply_to?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "larp_email_config_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: true
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
        ]
      }
      larp_organizers: {
        Row: {
          created_at: string
          email: string | null
          larp_id: string
          permissions: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          larp_id: string
          permissions?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          larp_id?: string
          permissions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "larp_organizers_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
        ]
      }
      larps: {
        Row: {
          created_at: string
          description: string | null
          footer_text: string | null
          id: string
          motto: string | null
          name: string
          owner_id: string
          payment_account: string | null
          slug: string
          theme: string | null
          updated_at: string
          visual_mode: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          footer_text?: string | null
          id?: string
          motto?: string | null
          name: string
          owner_id: string
          payment_account?: string | null
          slug: string
          theme?: string | null
          updated_at?: string
          visual_mode?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          footer_text?: string | null
          id?: string
          motto?: string | null
          name?: string
          owner_id?: string
          payment_account?: string | null
          slug?: string
          theme?: string | null
          updated_at?: string
          visual_mode?: string
        }
        Relationships: []
      }
      magic_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_used_at: string | null
          person_id: string | null
          revoked_at: string | null
          run_id: string
          scope: string
          token_hash: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          person_id?: string | null
          revoked_at?: string | null
          run_id: string
          scope: string
          token_hash: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          person_id?: string | null
          revoked_at?: string | null
          run_id?: string
          scope?: string
          token_hash?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_links_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_links_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_accounts: {
        Row: {
          auth_email: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_name: string | null
          id: string
          login: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_email: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          login: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_email?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          login?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_sync_log: {
        Row: {
          amount: number
          assignment_id: string | null
          created_at: string
          id: string
          matched: boolean
          matched_player_name: string | null
          message: string | null
          run_id: string
          sender_name: string | null
          transaction_date: string
          vs: string | null
        }
        Insert: {
          amount: number
          assignment_id?: string | null
          created_at?: string
          id?: string
          matched?: boolean
          matched_player_name?: string | null
          message?: string | null
          run_id: string
          sender_name?: string | null
          transaction_date: string
          vs?: string | null
        }
        Update: {
          amount?: number
          assignment_id?: string | null
          created_at?: string
          id?: string
          matched?: boolean
          matched_player_name?: string | null
          message?: string | null
          run_id?: string
          sender_name?: string | null
          transaction_date?: string
          vs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sync_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "run_person_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sync_log_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          access_token: string
          act_info: string | null
          created_at: string
          email: string | null
          group_name: string | null
          id: string
          larp_id: string | null
          medailonek: string | null
          mission_briefing: string | null
          name: string
          paid_at: string | null
          password_hash: string
          password_plain: string | null
          performance_times: string | null
          performer: string | null
          run_id: string | null
          schedule_color: string | null
          slug: string
          type: Database["public"]["Enums"]["person_type"]
          updated_at: string
        }
        Insert: {
          access_token?: string
          act_info?: string | null
          created_at?: string
          email?: string | null
          group_name?: string | null
          id?: string
          larp_id?: string | null
          medailonek?: string | null
          mission_briefing?: string | null
          name: string
          paid_at?: string | null
          password_hash: string
          password_plain?: string | null
          performance_times?: string | null
          performer?: string | null
          run_id?: string | null
          schedule_color?: string | null
          slug: string
          type: Database["public"]["Enums"]["person_type"]
          updated_at?: string
        }
        Update: {
          access_token?: string
          act_info?: string | null
          created_at?: string
          email?: string | null
          group_name?: string | null
          id?: string
          larp_id?: string | null
          medailonek?: string | null
          mission_briefing?: string | null
          name?: string
          paid_at?: string | null
          password_hash?: string
          password_plain?: string | null
          performance_times?: string | null
          performer?: string | null
          run_id?: string | null
          schedule_color?: string | null
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
      persons_backup_v1: {
        Row: {
          access_token: string | null
          act_info: string | null
          created_at: string | null
          group_name: string | null
          id: string | null
          larp_id: string | null
          medailonek: string | null
          mission_briefing: string | null
          name: string | null
          paid_at: string | null
          password_hash: string | null
          performance_times: string | null
          performer: string | null
          run_id: string | null
          schedule_color: string | null
          slug: string | null
          type: Database["public"]["Enums"]["person_type"] | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          act_info?: string | null
          created_at?: string | null
          group_name?: string | null
          id?: string | null
          larp_id?: string | null
          medailonek?: string | null
          mission_briefing?: string | null
          name?: string | null
          paid_at?: string | null
          password_hash?: string | null
          performance_times?: string | null
          performer?: string | null
          run_id?: string | null
          schedule_color?: string | null
          slug?: string | null
          type?: Database["public"]["Enums"]["person_type"] | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          act_info?: string | null
          created_at?: string | null
          group_name?: string | null
          id?: string | null
          larp_id?: string | null
          medailonek?: string | null
          mission_briefing?: string | null
          name?: string | null
          paid_at?: string | null
          password_hash?: string | null
          performance_times?: string | null
          performer?: string | null
          run_id?: string | null
          schedule_color?: string | null
          slug?: string | null
          type?: Database["public"]["Enums"]["person_type"] | null
          updated_at?: string | null
        }
        Relationships: []
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
      production_materials: {
        Row: {
          created_at: string
          id: string
          larp_id: string
          material_type: string
          note: string | null
          run_id: string | null
          sort_order: number
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          larp_id: string
          material_type?: string
          note?: string | null
          run_id?: string | null
          sort_order?: number
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          larp_id?: string
          material_type?: string
          note?: string | null
          run_id?: string | null
          sort_order?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_materials_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_materials_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_portal_access: {
        Row: {
          created_at: string
          id: string
          larp_id: string
          name: string | null
          password_hash: string
          run_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          larp_id: string
          name?: string | null
          password_hash: string
          run_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          larp_id?: string
          name?: string | null
          password_hash?: string
          run_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_portal_access_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_portal_access_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_checklist: {
        Row: {
          checklist_group: string
          completed: boolean
          created_at: string
          id: string
          run_id: string
          sort_order: number
          title: string
        }
        Insert: {
          checklist_group?: string
          completed?: boolean
          created_at?: string
          id?: string
          run_id: string
          sort_order?: number
          title: string
        }
        Update: {
          checklist_group?: string
          completed?: boolean
          created_at?: string
          id?: string
          run_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_checklist_run_id_fkey"
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
          payment_instructions: string | null
          payment_mode: string
          run_number: number | null
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
          payment_instructions?: string | null
          payment_mode?: string
          run_number?: number | null
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
          payment_instructions?: string | null
          payment_mode?: string
          run_number?: number | null
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
      runs_backup_v1: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string | null
          date_from: string | null
          date_to: string | null
          footer_text: string | null
          id: string | null
          is_active: boolean | null
          larp_id: string | null
          location: string | null
          mission_briefing: string | null
          name: string | null
          payment_account: string | null
          payment_amount: string | null
          payment_due_date: string | null
          payment_instructions: string | null
          payment_mode: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          footer_text?: string | null
          id?: string | null
          is_active?: boolean | null
          larp_id?: string | null
          location?: string | null
          mission_briefing?: string | null
          name?: string | null
          payment_account?: string | null
          payment_amount?: string | null
          payment_due_date?: string | null
          payment_instructions?: string | null
          payment_mode?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          footer_text?: string | null
          id?: string | null
          is_active?: boolean | null
          larp_id?: string | null
          location?: string | null
          mission_briefing?: string | null
          name?: string | null
          payment_account?: string | null
          payment_amount?: string | null
          payment_due_date?: string | null
          payment_instructions?: string | null
          payment_mode?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_events: {
        Row: {
          cp_id: string | null
          cp_scene_id: string | null
          created_at: string
          day_number: number
          description: string | null
          document_id: string | null
          duration_minutes: number
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          larp_id: string
          location: string | null
          material_id: string | null
          performer_text: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          cp_id?: string | null
          cp_scene_id?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          document_id?: string | null
          duration_minutes?: number
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          larp_id: string
          location?: string | null
          material_id?: string | null
          performer_text?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          cp_id?: string | null
          cp_scene_id?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          document_id?: string | null
          duration_minutes?: number
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          larp_id?: string
          location?: string | null
          material_id?: string | null
          performer_text?: string | null
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
            foreignKeyName: "schedule_events_cp_scene_id_fkey"
            columns: ["cp_scene_id"]
            isOneToOne: false
            referencedRelation: "cp_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_larp_id_fkey"
            columns: ["larp_id"]
            isOneToOne: false
            referencedRelation: "larps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "production_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events_backup_v1: {
        Row: {
          cp_id: string | null
          cp_scene_id: string | null
          created_at: string | null
          day_number: number | null
          description: string | null
          document_id: string | null
          duration_minutes: number | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string | null
          location: string | null
          material_id: string | null
          performer_text: string | null
          run_id: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cp_id?: string | null
          cp_scene_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          document_id?: string | null
          duration_minutes?: number | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string | null
          location?: string | null
          material_id?: string | null
          performer_text?: string | null
          run_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cp_id?: string | null
          cp_scene_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          document_id?: string | null
          duration_minutes?: number | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string | null
          location?: string | null
          material_id?: string | null
          performer_text?: string | null
          run_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_events_backup_v2: {
        Row: {
          cp_id: string | null
          cp_scene_id: string | null
          created_at: string | null
          day_number: number | null
          description: string | null
          document_id: string | null
          duration_minutes: number | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string | null
          location: string | null
          material_id: string | null
          performer_text: string | null
          run_id: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cp_id?: string | null
          cp_scene_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          document_id?: string | null
          duration_minutes?: number | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string | null
          location?: string | null
          material_id?: string | null
          performer_text?: string | null
          run_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cp_id?: string | null
          cp_scene_id?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          document_id?: string | null
          duration_minutes?: number | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string | null
          location?: string | null
          material_id?: string | null
          performer_text?: string | null
          run_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_portal_access: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          run_id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          run_id: string
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          run_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_portal_access_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_larp: { Args: { p_larp_id: string }; Returns: boolean }
      can_edit_larp_section: {
        Args: { p_larp_id: string; p_section: string }
        Returns: boolean
      }
      can_edit_run_section: {
        Args: { p_run_id: string; p_section: string }
        Returns: boolean
      }
      can_view_larp_section: {
        Args: { p_larp_id: string; p_section: string }
        Returns: boolean
      }
      can_view_run_section: {
        Args: { p_run_id: string; p_section: string }
        Returns: boolean
      }
      check_production_portal_passwordless: {
        Args: { p_token: string }
        Returns: Json
      }
      check_schedule_portal_passwordless: {
        Args: { p_token: string }
        Returns: Json
      }
      consume_magic_link: {
        Args: { p_token: string }
        Returns: {
          larp_slug: string
          person_id: string
          person_slug: string
          run_id: string
          scope: string
        }[]
      }
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
      create_production_portal_access: {
        Args: { p_larp_id: string; p_password: string; p_run_id: string }
        Returns: string
      }
      create_production_portal_access_no_password: {
        Args: { p_larp_id: string; p_run_id?: string }
        Returns: string
      }
      create_run_magic_link: {
        Args: {
          p_person_id: string
          p_run_id: string
          p_scope?: string
          p_ttl_days?: number
        }
        Returns: string
      }
      create_schedule_portal_access: {
        Args: { p_password: string; p_run_id: string }
        Returns: string
      }
      create_schedule_portal_access_no_password: {
        Args: { p_run_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_cp_portal_full_data: {
        Args: { p_larp_id: string; p_run_id?: string }
        Returns: Json
      }
      get_cp_scenes_for_portal: {
        Args: { p_person_id: string }
        Returns: {
          day_number: number
          description: string
          duration_minutes: number
          id: string
          location: string
          props: string
          start_time: string
        }[]
      }
      get_my_organizer_larp_ids: {
        Args: never
        Returns: {
          larp_id: string
        }[]
      }
      get_organizer_auth_email: { Args: { p_login: string }; Returns: string }
      get_person_documents: {
        Args: { p_person_id: string }
        Returns: {
          content: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          is_shared: boolean
          priority: number
          sort_order: number
          target_type: Database["public"]["Enums"]["document_target"]
          title: string
        }[]
      }
      get_portal_session_as_organizer:
        | {
            Args: { p_person_slug: string }
            Returns: {
              group_name: string
              larp_id: string
              larp_motto: string
              larp_name: string
              larp_slug: string
              larp_theme: string
              mission_briefing: string
              performance_times: string
              performer: string
              person_id: string
              person_medailonek: string
              person_name: string
              person_paid_at: string
              person_type: Database["public"]["Enums"]["person_type"]
              player_name: string
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
        | {
            Args: { p_larp_slug?: string; p_person_slug: string }
            Returns: {
              group_name: string
              larp_id: string
              larp_motto: string
              larp_name: string
              larp_slug: string
              larp_theme: string
              mission_briefing: string
              performance_times: string
              performer: string
              person_id: string
              person_medailonek: string
              person_name: string
              person_paid_at: string
              person_type: Database["public"]["Enums"]["person_type"]
              player_name: string
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
      get_portal_session_without_password:
        | {
            Args: { p_slug: string }
            Returns: {
              group_name: string
              larp_id: string
              larp_motto: string
              larp_name: string
              larp_slug: string
              larp_theme: string
              mission_briefing: string
              performance_times: string
              performer: string
              person_id: string
              person_medailonek: string
              person_name: string
              person_paid_at: string
              person_type: Database["public"]["Enums"]["person_type"]
              player_name: string
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
        | {
            Args: { p_larp_slug?: string; p_slug: string }
            Returns: {
              group_name: string
              larp_id: string
              larp_motto: string
              larp_name: string
              larp_slug: string
              larp_theme: string
              mission_briefing: string
              performance_times: string
              performer: string
              person_id: string
              person_medailonek: string
              person_name: string
              person_paid_at: string
              person_type: Database["public"]["Enums"]["person_type"]
              player_name: string
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
      get_production_portal_data: { Args: { p_token: string }; Returns: Json }
      get_run_cockpit_stats: { Args: { p_run_id: string }; Returns: Json }
      get_run_payment_info: {
        Args: { p_run_id: string }
        Returns: {
          payment_instructions: string
          payment_mode: string
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
      get_schedule_portal_events: { Args: { p_token: string }; Returns: Json }
      is_larp_owner: { Args: { larp_id: string }; Returns: boolean }
      is_run_owner: { Args: { run_id: string }; Returns: boolean }
      larp_section_level: {
        Args: { p_larp_id: string; p_section: string }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      remove_production_portal_password: {
        Args: { p_access_id: string }
        Returns: boolean
      }
      remove_schedule_portal_password: {
        Args: { p_access_id: string }
        Returns: boolean
      }
      set_checklist_item_completed: {
        Args: { p_completed: boolean; p_item_id: string; p_token: string }
        Returns: boolean
      }
      set_production_portal_password: {
        Args: { p_access_id: string; p_new_password: string }
        Returns: boolean
      }
      set_schedule_portal_password: {
        Args: { p_access_id: string; p_new_password: string }
        Returns: boolean
      }
      verify_cp_portal_access: {
        Args: { p_larp_slug: string; p_password: string }
        Returns: {
          larp_id: string
          larp_motto: string
          larp_name: string
          larp_theme: string
          run_id: string
          run_name: string
        }[]
      }
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
      verify_person_by_slug:
        | {
            Args: { p_password: string; p_slug: string }
            Returns: {
              group_name: string
              larp_id: string
              larp_motto: string
              larp_name: string
              larp_slug: string
              larp_theme: string
              mission_briefing: string
              performance_times: string
              performer: string
              person_id: string
              person_medailonek: string
              person_name: string
              person_paid_at: string
              person_type: Database["public"]["Enums"]["person_type"]
              player_name: string
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
        | {
            Args: { p_larp_slug?: string; p_password: string; p_slug: string }
            Returns: {
              group_name: string
              larp_id: string
              larp_motto: string
              larp_name: string
              larp_slug: string
              larp_theme: string
              mission_briefing: string
              performance_times: string
              performer: string
              person_id: string
              person_medailonek: string
              person_name: string
              person_paid_at: string
              person_type: Database["public"]["Enums"]["person_type"]
              player_name: string
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
      verify_production_portal_access: {
        Args: { p_password: string; p_token: string }
        Returns: {
          larp_id: string
          larp_name: string
          larp_slug: string
          run_id: string
          run_name: string
        }[]
      }
      verify_schedule_portal_access: {
        Args: { p_password: string; p_token: string }
        Returns: {
          run_id: string
          run_name: string
        }[]
      }
    }
    Enums: {
      doc_category: "organizacni" | "herni" | "produkcni"
      document_target: "vsichni" | "skupina" | "osoba"
      document_type:
        | "organizacni"
        | "herni"
        | "postava"
        | "medailonek"
        | "cp"
        | "produkční"
      event_type:
        | "programovy_blok"
        | "jidlo"
        | "presun"
        | "informace"
        | "vystoupeni_cp"
        | "material"
        | "organizacni"
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
      doc_category: ["organizacni", "herni", "produkcni"],
      document_target: ["vsichni", "skupina", "osoba"],
      document_type: [
        "organizacni",
        "herni",
        "postava",
        "medailonek",
        "cp",
        "produkční",
      ],
      event_type: [
        "programovy_blok",
        "jidlo",
        "presun",
        "informace",
        "vystoupeni_cp",
        "material",
        "organizacni",
      ],
      feedback_status: ["new", "read", "resolved"],
      person_type: ["postava", "cp"],
    },
  },
} as const
