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
      academy_trainings: {
        Row: {
          certificate_design_id: string | null
          club_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          certificate_design_id?: string | null
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          certificate_design_id?: string | null
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_trainings_certificate_design_id_fkey"
            columns: ["certificate_design_id"]
            isOneToOne: false
            referencedRelation: "certificate_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_trainings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_trainings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_message_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          rating: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          rating: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          rating?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string
          club_id: string
          created_at: string
          duration_ms: number | null
          format: string
          id: string
          ip_address: string | null
          resource: string
          response_rows: number
          status_code: number
        }
        Insert: {
          api_key_id: string
          club_id: string
          created_at?: string
          duration_ms?: number | null
          format?: string
          id?: string
          ip_address?: string | null
          resource: string
          response_rows?: number
          status_code?: number
        }
        Update: {
          api_key_id?: string
          club_id?: string
          created_at?: string
          duration_ms?: number | null
          format?: string
          id?: string
          ip_address?: string | null
          resource?: string
          response_rows?: number
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "club_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          club_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          condition_type: string
          created_at: string
          description_en: string | null
          description_fr: string | null
          description_nl: string | null
          icon: string
          id: string
          key: string
          name_en: string
          name_fr: string
          name_nl: string
          threshold: number
        }
        Insert: {
          condition_type: string
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          description_nl?: string | null
          icon?: string
          id?: string
          key: string
          name_en: string
          name_fr: string
          name_nl: string
          threshold?: number
        }
        Update: {
          condition_type?: string
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          description_nl?: string | null
          icon?: string
          id?: string
          key?: string
          name_en?: string
          name_fr?: string
          name_nl?: string
          threshold?: number
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          amount_cents: number | null
          club_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          partner_id: string | null
          season_id: string | null
          stripe_payment_intent_id: string | null
          volunteer_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          club_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          season_id?: string | null
          stripe_payment_intent_id?: string | null
          volunteer_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          club_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          season_id?: string | null
          stripe_payment_intent_id?: string | null
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_block_progress: {
        Row: {
          block_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          volunteer_id: string
        }
        Insert: {
          block_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          volunteer_id: string
        }
        Update: {
          block_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_block_progress_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "briefing_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_blocks: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          contact_role: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          group_id: string
          id: string
          location: string | null
          sort_order: number
          start_time: string | null
          title: string | null
          type: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          group_id: string
          id?: string
          location?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string | null
          type: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          group_id?: string
          id?: string
          location?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_blocks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "briefing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_checklist_items: {
        Row: {
          assigned_team_id: string | null
          assigned_volunteer_id: string | null
          block_id: string
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_volunteer_id?: string | null
          block_id: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          assigned_team_id?: string | null
          assigned_volunteer_id?: string | null
          block_id?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "briefing_checklist_items_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "safety_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefing_checklist_items_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "briefing_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_checklist_progress: {
        Row: {
          checked: boolean
          checked_at: string | null
          checklist_item_id: string
          created_at: string
          id: string
          volunteer_id: string
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          checklist_item_id: string
          created_at?: string
          id?: string
          volunteer_id: string
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          checklist_item_id?: string
          created_at?: string
          id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "briefing_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_group_volunteers: {
        Row: {
          created_at: string
          group_id: string
          id: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_group_volunteers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "briefing_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_groups: {
        Row: {
          briefing_id: string
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          briefing_id: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Update: {
          briefing_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "briefing_groups_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_route_waypoints: {
        Row: {
          arrival_time: string | null
          block_id: string
          created_at: string
          description: string | null
          id: string
          label: string
          lat: number
          lng: number
          sort_order: number
        }
        Insert: {
          arrival_time?: string | null
          block_id: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          lat: number
          lng: number
          sort_order?: number
        }
        Update: {
          arrival_time?: string | null
          block_id?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          lat?: number
          lng?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "briefing_route_waypoints_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "briefing_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          id: string
          planned_send_at: string | null
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          planned_send_at?: string | null
          task_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          planned_send_at?: string | null
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      certificate_designs: {
        Row: {
          accent_color: string | null
          club_id: string
          created_at: string
          custom_text: string | null
          id: string
          issuer_name: string | null
          issuer_title: string | null
          name: string
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          club_id: string
          created_at?: string
          custom_text?: string | null
          id?: string
          issuer_name?: string | null
          issuer_title?: string | null
          name?: string
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          club_id?: string
          created_at?: string
          custom_text?: string | null
          id?: string
          issuer_name?: string | null
          issuer_title?: string | null
          name?: string
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_designs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_designs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_tasks: {
        Row: {
          assigned_team_id: string | null
          assigned_volunteer_id: string | null
          club_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string
          event_id: string
          id: string
          note: string | null
          photo_url: string | null
          requires_note: boolean
          requires_photo: boolean
          sort_order: number
          status: string
          template_item_id: string | null
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_volunteer_id?: string | null
          club_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description: string
          event_id: string
          id?: string
          note?: string | null
          photo_url?: string | null
          requires_note?: boolean
          requires_photo?: boolean
          sort_order?: number
          status?: string
          template_item_id?: string | null
        }
        Update: {
          assigned_team_id?: string | null
          assigned_volunteer_id?: string | null
          club_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          note?: string | null
          photo_url?: string | null
          requires_note?: boolean
          requires_photo?: boolean
          sort_order?: number
          status?: string
          template_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_tasks_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "safety_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_tasks_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "closing_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_template_items: {
        Row: {
          created_at: string
          description: string
          id: string
          requires_note: boolean
          requires_photo: boolean
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          requires_note?: boolean
          requires_photo?: boolean
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          requires_note?: boolean
          requires_photo?: boolean
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "closing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_templates: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_api_keys: {
        Row: {
          api_key: string
          calls_this_hour: number
          club_id: string
          created_at: string
          created_by: string | null
          hour_window_start: string | null
          id: string
          is_active: boolean
          key_prefix: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          api_key?: string
          calls_this_hour?: number
          club_id: string
          created_at?: string
          created_by?: string | null
          hour_window_start?: string | null
          id?: string
          is_active?: boolean
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Update: {
          api_key?: string
          calls_this_hour?: number
          club_id?: string
          created_at?: string
          created_by?: string | null
          hour_window_start?: string | null
          id?: string
          is_active?: boolean
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_api_keys_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_api_keys_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_billing: {
        Row: {
          billing_email: string | null
          club_id: string
          created_at: string
          current_season_volunteers_billed: number
          free_contracts_limit: number
          free_contracts_used: number
          id: string
          partner_seat_price_cents: number
          partner_seats_purchased: number
          stripe_customer_id: string | null
          updated_at: string
          volunteer_price_cents: number
        }
        Insert: {
          billing_email?: string | null
          club_id: string
          created_at?: string
          current_season_volunteers_billed?: number
          free_contracts_limit?: number
          free_contracts_used?: number
          id?: string
          partner_seat_price_cents?: number
          partner_seats_purchased?: number
          stripe_customer_id?: string | null
          updated_at?: string
          volunteer_price_cents?: number
        }
        Update: {
          billing_email?: string | null
          club_id?: string
          created_at?: string
          current_season_volunteers_billed?: number
          free_contracts_limit?: number
          free_contracts_used?: number
          id?: string
          partner_seat_price_cents?: number
          partner_seats_purchased?: number
          stripe_customer_id?: string | null
          updated_at?: string
          volunteer_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_billing_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_billing_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_follows: {
        Row: {
          club_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_follows_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_follows_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invitations: {
        Row: {
          club_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          role: Database["public"]["Enums"]["club_role"]
          status: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          role?: Database["public"]["Enums"]["club_role"]
          status?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["club_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["club_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_memberships: {
        Row: {
          club_id: string
          club_role: string
          id: string
          joined_at: string
          status: string
          volunteer_id: string
        }
        Insert: {
          club_id: string
          club_role?: string
          id?: string
          joined_at?: string
          status?: string
          volunteer_id: string
        }
        Update: {
          club_id?: string
          club_role?: string
          id?: string
          joined_at?: string
          status?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_memberships_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_memberships_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_onboarding_config: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_required: boolean
          sort_order: number
          step: Database["public"]["Enums"]["onboarding_step"]
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          step: Database["public"]["Enums"]["onboarding_step"]
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          step?: Database["public"]["Enums"]["onboarding_step"]
        }
        Relationships: [
          {
            foreignKeyName: "club_onboarding_config_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_onboarding_config_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_onboarding_emails: {
        Row: {
          club_id: string
          created_at: string
          email_step: number
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email_step: number
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email_step?: number
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_onboarding_emails_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_onboarding_emails_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_pos_settings: {
        Row: {
          club_id: string
          created_at: string
          pos_api_key: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          pos_api_key?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          pos_api_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_pos_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_pos_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_referrals: {
        Row: {
          bonus_points_awarded: number
          club_id: string
          completed_at: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_points_awarded?: number
          club_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_points_awarded?: number
          club_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_referrals_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_referrals_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_required_trainings: {
        Row: {
          club_id: string
          created_at: string
          id: string
          training_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          training_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_required_trainings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_required_trainings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_required_trainings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      club_reward_settings: {
        Row: {
          canteen_enabled: boolean
          canteen_reward_eur: number
          club_id: string
          created_at: string
          fanshop_credit_enabled: boolean
          fanshop_credit_per_shift: number
          free_coffee_enabled: boolean
          free_drinks_enabled: boolean
          free_drinks_per_shift: number
          id: string
          updated_at: string
        }
        Insert: {
          canteen_enabled?: boolean
          canteen_reward_eur?: number
          club_id: string
          created_at?: string
          fanshop_credit_enabled?: boolean
          fanshop_credit_per_shift?: number
          free_coffee_enabled?: boolean
          free_drinks_enabled?: boolean
          free_drinks_per_shift?: number
          id?: string
          updated_at?: string
        }
        Update: {
          canteen_enabled?: boolean
          canteen_reward_eur?: number
          club_id?: string
          created_at?: string
          fanshop_credit_enabled?: boolean
          fanshop_credit_per_shift?: number
          free_coffee_enabled?: boolean
          free_drinks_enabled?: boolean
          free_drinks_per_shift?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_reward_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reward_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          allow_shift_swaps: boolean
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          owner_id: string
          referral_bonus_points: number
          sport: string | null
          stripe_account_id: string | null
          why_volunteer: string | null
        }
        Insert: {
          allow_shift_swaps?: boolean
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          referral_bonus_points?: number
          sport?: string | null
          stripe_account_id?: string | null
          why_volunteer?: string | null
        }
        Update: {
          allow_shift_swaps?: boolean
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          referral_bonus_points?: number
          sport?: string | null
          stripe_account_id?: string | null
          why_volunteer?: string | null
        }
        Relationships: []
      }
      compliance_declarations: {
        Row: {
          created_at: string
          declaration_month: number
          declaration_year: number
          declared_at: string
          document_url: string | null
          docuseal_submission_id: number | null
          external_hours: number
          external_income: number
          id: string
          signature_status: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          declaration_month: number
          declaration_year: number
          declared_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          external_hours?: number
          external_income?: number
          id?: string
          signature_status?: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          declaration_month?: number
          declaration_year?: number
          declared_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          external_hours?: number
          external_income?: number
          id?: string
          signature_status?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          created_at: string
          id: string
          source_field: string
          source_hash: string
          source_id: string
          source_table: string
          target_language: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_field: string
          source_hash: string
          source_id: string
          source_table: string
          target_language: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          source_field?: string
          source_hash?: string
          source_id?: string
          source_table?: string
          target_language?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          club_id: string
          created_at: string
          created_by: string
          docuseal_template_id: number
          file_path: string | null
          id: string
          name: string
          template_data: Json | null
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          docuseal_template_id: number
          file_path?: string | null
          id?: string
          name: string
          template_data?: Json | null
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          docuseal_template_id?: number
          file_path?: string | null
          id?: string
          name?: string
          template_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          club_owner_id: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          club_owner_id: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          club_owner_id?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          club_id: string
          created_at: string
          id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_layouts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_goals: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          id: string
          raised_amount: number
          status: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          raised_amount?: number
          status?: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          raised_amount?: number
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_goals_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_goals_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_transactions: {
        Row: {
          amount: number
          created_at: string
          donation_goal_id: string
          id: string
          task_id: string
          volunteer_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          donation_goal_id: string
          id?: string
          task_id: string
          volunteer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_goal_id?: string
          id?: string
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_transactions_donation_goal_id_fkey"
            columns: ["donation_goal_id"]
            isOneToOne: false
            referencedRelation: "donation_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_transactions_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_transactions_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
      event_availability: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          status: string
          task_id: string | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          status?: string
          task_id?: string | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          status?: string
          task_id?: string | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_availability_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_availability_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_chats: {
        Row: {
          attachment_url: string | null
          created_at: string
          event_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          event_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_chats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feed: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          photo_url: string | null
          pinned: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          photo_url?: string | null
          pinned?: boolean
          title?: string | null
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string | null
          pinned?: boolean
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feed_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_groups: {
        Row: {
          color: string
          created_at: string
          event_id: string
          id: string
          materials_note: string | null
          name: string
          sort_order: number
          wristband_color: string | null
          wristband_label: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          event_id: string
          id?: string
          materials_note?: string | null
          name: string
          sort_order?: number
          wristband_color?: string | null
          wristband_label?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          event_id?: string
          id?: string
          materials_note?: string | null
          name?: string
          sort_order?: number
          wristband_color?: string | null
          wristband_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          groups: Json
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          groups?: Json
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          groups?: Json
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          certificate_design_id: string | null
          closing_template_id: string | null
          club_id: string
          created_at: string
          description: string | null
          event_date: string | null
          event_type: string
          external_event_id: string | null
          id: string
          is_live: boolean
          kickoff_time: string | null
          location: string | null
          shift_template_id: string | null
          status: string
          title: string
          training_id: string | null
          updated_at: string
        }
        Insert: {
          certificate_design_id?: string | null
          closing_template_id?: string | null
          club_id: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          is_live?: boolean
          kickoff_time?: string | null
          location?: string | null
          shift_template_id?: string | null
          status?: string
          title: string
          training_id?: string | null
          updated_at?: string
        }
        Update: {
          certificate_design_id?: string | null
          closing_template_id?: string | null
          club_id?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          is_live?: boolean
          kickoff_time?: string | null
          location?: string | null
          shift_template_id?: string | null
          status?: string
          title?: string
          training_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_certificate_design_id_fkey"
            columns: ["certificate_design_id"]
            isOneToOne: false
            referencedRelation: "certificate_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_closing_template_id_fkey"
            columns: ["closing_template_id"]
            isOneToOne: false
            referencedRelation: "closing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      external_partners: {
        Row: {
          category: string
          club_id: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          external_payroll: boolean
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          club_id: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_payroll?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          club_id?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          external_payroll?: boolean
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_partners_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_partners_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      hour_confirmations: {
        Row: {
          club_approved: boolean
          club_reported_checkout: string | null
          club_reported_hours: number | null
          created_at: string
          dispute_escalated_at: string | null
          dispute_status: string
          final_amount: number | null
          final_hours: number | null
          id: string
          status: string
          task_id: string
          updated_at: string
          volunteer_approved: boolean
          volunteer_id: string
          volunteer_reported_checkout: string | null
          volunteer_reported_hours: number | null
        }
        Insert: {
          club_approved?: boolean
          club_reported_checkout?: string | null
          club_reported_hours?: number | null
          created_at?: string
          dispute_escalated_at?: string | null
          dispute_status?: string
          final_amount?: number | null
          final_hours?: number | null
          id?: string
          status?: string
          task_id: string
          updated_at?: string
          volunteer_approved?: boolean
          volunteer_id: string
          volunteer_reported_checkout?: string | null
          volunteer_reported_hours?: number | null
        }
        Update: {
          club_approved?: boolean
          club_reported_checkout?: string | null
          club_reported_hours?: number | null
          created_at?: string
          dispute_escalated_at?: string | null
          dispute_status?: string
          final_amount?: number | null
          final_hours?: number | null
          id?: string
          status?: string
          task_id?: string
          updated_at?: string
          volunteer_approved?: boolean
          volunteer_id?: string
          volunteer_reported_checkout?: string | null
          volunteer_reported_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hour_confirmations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_enrollments: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          points_earned: number
          program_id: string
          reward_claimed: boolean
          tasks_completed: number
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          program_id: string
          reward_claimed?: boolean
          tasks_completed?: number
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          program_id?: string
          reward_claimed?: boolean
          tasks_completed?: number
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_program_excluded_tasks: {
        Row: {
          created_at: string
          id: string
          program_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_program_excluded_tasks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_program_excluded_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_based: boolean
          required_points: number | null
          required_tasks: number
          reward_description: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_based?: boolean
          required_points?: number | null
          required_tasks?: number
          reward_description: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_based?: boolean
          required_points?: number | null
          required_tasks?: number
          reward_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      member_contract_types: {
        Row: {
          contract_type: string
          created_at: string
          id: string
          membership_id: string
        }
        Insert: {
          contract_type: string
          created_at?: string
          id?: string
          membership_id: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_contract_types_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_learning_completions: {
        Row: {
          completed_at: string
          id: string
          learning_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          learning_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          learning_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_learning_completions_learning_id_fkey"
            columns: ["learning_id"]
            isOneToOne: false
            referencedRelation: "micro_learnings"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_learnings: {
        Row: {
          club_id: string
          content: Json
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          skill_tag: string | null
          title: string
          type: string
        }
        Insert: {
          club_id: string
          content?: Json
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          skill_tag?: string | null
          title: string
          type?: string
        }
        Update: {
          club_id?: string
          content?: Json
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          skill_tag?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_learnings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_learnings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_day_signups: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string | null
          club_approved: boolean
          club_reported_checkout: string | null
          club_reported_hours: number | null
          created_at: string
          dispute_escalated_at: string | null
          dispute_status: string
          enrollment_id: string
          final_amount: number | null
          final_hours: number | null
          hour_status: string
          id: string
          plan_task_id: string
          status: string
          ticket_barcode: string | null
          volunteer_approved: boolean
          volunteer_id: string
          volunteer_reported_checkout: string | null
          volunteer_reported_hours: number | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          club_approved?: boolean
          club_reported_checkout?: string | null
          club_reported_hours?: number | null
          created_at?: string
          dispute_escalated_at?: string | null
          dispute_status?: string
          enrollment_id: string
          final_amount?: number | null
          final_hours?: number | null
          hour_status?: string
          id?: string
          plan_task_id: string
          status?: string
          ticket_barcode?: string | null
          volunteer_approved?: boolean
          volunteer_id: string
          volunteer_reported_checkout?: string | null
          volunteer_reported_hours?: number | null
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          club_approved?: boolean
          club_reported_checkout?: string | null
          club_reported_hours?: number | null
          created_at?: string
          dispute_escalated_at?: string | null
          dispute_status?: string
          enrollment_id?: string
          final_amount?: number | null
          final_hours?: number | null
          hour_status?: string
          id?: string
          plan_task_id?: string
          status?: string
          ticket_barcode?: string | null
          volunteer_approved?: boolean
          volunteer_id?: string
          volunteer_reported_checkout?: string | null
          volunteer_reported_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_day_signups_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "monthly_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_day_signups_plan_task_id_fkey"
            columns: ["plan_task_id"]
            isOneToOne: false
            referencedRelation: "monthly_plan_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_enrollments: {
        Row: {
          approval_status: string
          contract_status: string
          created_at: string
          document_url: string | null
          docuseal_submission_id: number | null
          id: string
          plan_id: string
          signed_at: string | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          approval_status?: string
          contract_status?: string
          created_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          plan_id: string
          signed_at?: string | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          approval_status?: string
          contract_status?: string
          created_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          plan_id?: string
          signed_at?: string | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "monthly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_invoices: {
        Row: {
          club_id: string
          created_at: string
          id: string
          invoice_month: number
          invoice_year: number
          paid_at: string | null
          partner_seats_amount_cents: number
          partner_seats_count: number
          pdf_url: string | null
          season_id: string | null
          status: string
          total_amount_cents: number
          volunteer_amount_cents: number
          volunteer_count: number
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          invoice_month: number
          invoice_year: number
          paid_at?: string | null
          partner_seats_amount_cents?: number
          partner_seats_count?: number
          pdf_url?: string | null
          season_id?: string | null
          status?: string
          total_amount_cents?: number
          volunteer_amount_cents?: number
          volunteer_count?: number
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          invoice_month?: number
          invoice_year?: number
          paid_at?: string | null
          partner_seats_amount_cents?: number
          partner_seats_count?: number
          pdf_url?: string | null
          season_id?: string | null
          status?: string
          total_amount_cents?: number
          volunteer_amount_cents?: number
          volunteer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_invoices_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_invoices_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_payouts: {
        Row: {
          club_id: string
          created_at: string
          enrollment_id: string
          id: string
          paid_at: string | null
          plan_id: string
          status: string
          total_amount: number
          total_days: number
          total_hours: number
          volunteer_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          paid_at?: string | null
          plan_id: string
          status?: string
          total_amount?: number
          total_days?: number
          total_hours?: number
          volunteer_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          paid_at?: string | null
          plan_id?: string
          status?: string
          total_amount?: number
          total_days?: number
          total_hours?: number
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payouts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_payouts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_payouts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "monthly_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_payouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "monthly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_plan_tasks: {
        Row: {
          category: string
          compensation_type: string
          created_at: string
          daily_rate: number | null
          description: string | null
          end_time: string | null
          estimated_hours: number | null
          hourly_rate: number | null
          id: string
          location: string | null
          plan_id: string
          spots_available: number
          start_time: string | null
          task_date: string
          title: string
        }
        Insert: {
          category?: string
          compensation_type?: string
          created_at?: string
          daily_rate?: number | null
          description?: string | null
          end_time?: string | null
          estimated_hours?: number | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          plan_id: string
          spots_available?: number
          start_time?: string | null
          task_date: string
          title: string
        }
        Update: {
          category?: string
          compensation_type?: string
          created_at?: string
          daily_rate?: number | null
          description?: string | null
          end_time?: string | null
          estimated_hours?: number | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          plan_id?: string
          spots_available?: number
          start_time?: string | null
          task_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_plan_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "monthly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_plans: {
        Row: {
          club_id: string
          contract_template_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          month: number
          status: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          club_id: string
          contract_template_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          month: number
          status?: string
          title?: string
          updated_at?: string
          year: number
        }
        Update: {
          club_id?: string
          contract_template_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          month?: number
          status?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_plans_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_type: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_admins: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          partner_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          partner_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          partner_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_admins_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_clubs: {
        Row: {
          club_id: string
          created_at: string
          id: string
          partner_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          partner_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clubs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_event_access: {
        Row: {
          created_at: string
          event_id: string
          id: string
          max_spots: number | null
          partner_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          max_spots?: number | null
          partner_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          max_spots?: number | null
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_event_access_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_event_access_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_event_signups: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          partner_event_access_id: string
          partner_member_id: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          partner_event_access_id: string
          partner_member_id: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          partner_event_access_id?: string
          partner_member_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_event_signups_partner_event_access_id_fkey"
            columns: ["partner_event_access_id"]
            isOneToOne: false
            referencedRelation: "partner_event_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_event_signups_partner_member_id_fkey"
            columns: ["partner_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_members: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          national_id: string | null
          notes: string | null
          partner_id: string
          phone: string | null
          postal_code: string | null
          shirt_size: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          national_id?: string | null
          notes?: string | null
          partner_id: string
          phone?: string | null
          postal_code?: string | null
          shirt_size?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          national_id?: string | null
          notes?: string | null
          partner_id?: string
          phone?: string | null
          postal_code?: string | null
          shirt_size?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_members_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_seat_allocations: {
        Row: {
          club_id: string
          created_at: string
          event_id: string | null
          id: string
          partner_id: string
          season_id: string
          seats_allocated: number
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          partner_id: string
          season_id: string
          seats_allocated?: number
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          partner_id?: string
          season_id?: string
          seats_allocated?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_seat_allocations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_seat_allocations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_seat_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_seat_allocations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_seat_allocations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_task_assignments: {
        Row: {
          assigned_by: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          id: string
          partner_member_id: string
          task_id: string
        }
        Insert: {
          assigned_by?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          id?: string
          partner_member_id: string
          task_id: string
        }
        Update: {
          assigned_by?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          id?: string
          partner_member_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_task_assignments_partner_member_id_fkey"
            columns: ["partner_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank_bic: string | null
          bank_consent_date: string | null
          bank_consent_given: boolean
          bank_consent_text: string | null
          bank_holder_name: string | null
          bank_iban: string | null
          bio: string | null
          city: string | null
          club_onboarding_step: string
          compliance_blocked: boolean
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_tour_seen: boolean | null
          full_name: string | null
          id: string
          in_app_notifications_enabled: boolean
          language: string
          linked_partner_id: string | null
          onesignal_player_id: string | null
          phone: string | null
          preferences: Json | null
          primary_club_id: string | null
          public_profile: boolean
          push_notifications_enabled: boolean
          push_prompt_seen: boolean
          referral_code: string | null
          referred_by: string | null
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bank_bic?: string | null
          bank_consent_date?: string | null
          bank_consent_given?: boolean
          bank_consent_text?: string | null
          bank_holder_name?: string | null
          bank_iban?: string | null
          bio?: string | null
          city?: string | null
          club_onboarding_step?: string
          compliance_blocked?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_tour_seen?: boolean | null
          full_name?: string | null
          id: string
          in_app_notifications_enabled?: boolean
          language?: string
          linked_partner_id?: string | null
          onesignal_player_id?: string | null
          phone?: string | null
          preferences?: Json | null
          primary_club_id?: string | null
          public_profile?: boolean
          push_notifications_enabled?: boolean
          push_prompt_seen?: boolean
          referral_code?: string | null
          referred_by?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bank_bic?: string | null
          bank_consent_date?: string | null
          bank_consent_given?: boolean
          bank_consent_text?: string | null
          bank_holder_name?: string | null
          bank_iban?: string | null
          bio?: string | null
          city?: string | null
          club_onboarding_step?: string
          compliance_blocked?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_tour_seen?: boolean | null
          full_name?: string | null
          id?: string
          in_app_notifications_enabled?: boolean
          language?: string
          linked_partner_id?: string | null
          onesignal_player_id?: string | null
          phone?: string | null
          preferences?: Json | null
          primary_club_id?: string | null
          public_profile?: boolean
          push_notifications_enabled?: boolean
          push_prompt_seen?: boolean
          referral_code?: string | null
          referred_by?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_partner_id_fkey"
            columns: ["linked_partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_club_id_fkey"
            columns: ["primary_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_club_id_fkey"
            columns: ["primary_club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer_index: number
          created_at: string
          id: string
          options: Json
          question_text: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer_index?: number
          created_at?: string
          id?: string
          options?: Json
          question_text: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer_index?: number
          created_at?: string
          id?: string
          options?: Json
          question_text?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_awarded: boolean
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_awarded?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_awarded?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          id: string
          reference_id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          reference_id: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          reference_id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reserve_lists: {
        Row: {
          club_id: string
          created_at: string
          event_date: string | null
          event_id: string | null
          id: string
          task_type: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          event_date?: string | null
          event_id?: string | null
          id?: string
          task_type?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          event_date?: string | null
          event_id?: string | null
          id?: string
          task_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserve_lists_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_lists_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_lists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_checklist_items: {
        Row: {
          assigned_team_id: string | null
          assigned_volunteer_id: string | null
          club_id: string
          created_at: string
          description: string
          event_id: string
          id: string
          sort_order: number
          zone_id: string | null
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_volunteer_id?: string | null
          club_id: string
          created_at?: string
          description: string
          event_id: string
          id?: string
          sort_order?: number
          zone_id?: string | null
        }
        Update: {
          assigned_team_id?: string | null
          assigned_volunteer_id?: string | null
          club_id?: string
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          sort_order?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_checklist_items_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "safety_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checklist_items_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "safety_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_checklist_progress: {
        Row: {
          checklist_item_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          volunteer_id: string
        }
        Insert: {
          checklist_item_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          volunteer_id: string
        }
        Update: {
          checklist_item_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "safety_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incident_types: {
        Row: {
          club_id: string
          color: string
          created_at: string
          default_priority: string
          emoji: string | null
          icon: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          club_id: string
          color?: string
          created_at?: string
          default_priority?: string
          emoji?: string | null
          icon?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          club_id?: string
          color?: string
          created_at?: string
          default_priority?: string
          emoji?: string | null
          icon?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_incident_types_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_types_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          incident_type_id: string | null
          lat: number | null
          lng: number | null
          location_data: Json | null
          photo_url: string | null
          priority: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          incident_type_id?: string | null
          lat?: number | null
          lng?: number | null
          location_data?: Json | null
          photo_url?: string | null
          priority?: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          incident_type_id?: string | null
          lat?: number | null
          lng?: number | null
          location_data?: Json | null
          photo_url?: string | null
          priority?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_incident_type_id_fkey"
            columns: ["incident_type_id"]
            isOneToOne: false
            referencedRelation: "safety_incident_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "safety_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_location_levels: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_required: boolean
          name: string
          sort_order: number
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_location_levels_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_location_levels_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_location_options: {
        Row: {
          created_at: string
          id: string
          label: string
          level_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          level_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          level_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_location_options_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "safety_location_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_roles: {
        Row: {
          can_complete_checklist: boolean
          can_complete_closing: boolean
          can_report_incidents: boolean
          can_resolve_incidents: boolean
          can_view_team: boolean
          club_id: string
          color: string
          created_at: string
          id: string
          level: number
          name: string
          sort_order: number
        }
        Insert: {
          can_complete_checklist?: boolean
          can_complete_closing?: boolean
          can_report_incidents?: boolean
          can_resolve_incidents?: boolean
          can_view_team?: boolean
          club_id: string
          color?: string
          created_at?: string
          id?: string
          level?: number
          name: string
          sort_order?: number
        }
        Update: {
          can_complete_checklist?: boolean
          can_complete_closing?: boolean
          can_report_incidents?: boolean
          can_resolve_incidents?: boolean
          can_view_team?: boolean
          club_id?: string
          color?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "safety_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_teams: {
        Row: {
          club_id: string
          created_at: string
          event_id: string
          id: string
          leader_id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          leader_id: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          leader_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_zones: {
        Row: {
          checklist_active: boolean
          club_id: string
          color: string
          created_at: string
          event_group_id: string | null
          event_id: string
          id: string
          name: string
          sort_order: number
          status: string
        }
        Insert: {
          checklist_active?: boolean
          club_id: string
          color?: string
          created_at?: string
          event_group_id?: string | null
          event_id: string
          id?: string
          name: string
          sort_order?: number
          status?: string
        }
        Update: {
          checklist_active?: boolean
          club_id?: string
          color?: string
          created_at?: string
          event_group_id?: string | null
          event_id?: string
          id?: string
          name?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_zones_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_zones_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_zones_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      season_checkins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          club_id: string
          created_at: string
          hours_worked: number | null
          id: string
          notes: string | null
          season_contract_id: string
          volunteer_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          club_id: string
          created_at?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          season_contract_id: string
          volunteer_id: string
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          club_id?: string
          created_at?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          season_contract_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_checkins_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_checkins_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_checkins_season_contract_id_fkey"
            columns: ["season_contract_id"]
            isOneToOne: false
            referencedRelation: "season_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      season_contract_templates: {
        Row: {
          category: Database["public"]["Enums"]["season_template_category"]
          club_id: string | null
          created_at: string
          description: string | null
          docuseal_template_id: number | null
          id: string
          is_system: boolean
          name: string
          template_data: Json | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["season_template_category"]
          club_id?: string | null
          created_at?: string
          description?: string | null
          docuseal_template_id?: number | null
          id?: string
          is_system?: boolean
          name: string
          template_data?: Json | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["season_template_category"]
          club_id?: string | null
          created_at?: string
          description?: string | null
          docuseal_template_id?: number | null
          id?: string
          is_system?: boolean
          name?: string
          template_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_contract_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_contract_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      season_contracts: {
        Row: {
          archived_at: string | null
          barcode: string | null
          checkin_count: number
          club_id: string
          contract_type: string | null
          created_at: string
          document_url: string | null
          docuseal_submission_id: number | null
          id: string
          is_billable: boolean | null
          season_id: string
          signed_at: string | null
          signing_url: string | null
          status: string
          template_id: string
          updated_at: string
          volunteer_id: string
          volunteer_status: string
        }
        Insert: {
          archived_at?: string | null
          barcode?: string | null
          checkin_count?: number
          club_id: string
          contract_type?: string | null
          created_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          is_billable?: boolean | null
          season_id: string
          signed_at?: string | null
          signing_url?: string | null
          status?: string
          template_id: string
          updated_at?: string
          volunteer_id: string
          volunteer_status?: string
        }
        Update: {
          archived_at?: string | null
          barcode?: string | null
          checkin_count?: number
          club_id?: string
          contract_type?: string | null
          created_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          is_billable?: boolean | null
          season_id?: string
          signed_at?: string | null
          signing_url?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          volunteer_id?: string
          volunteer_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_contracts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_contracts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_contracts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "season_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          club_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      sepa_batch_items: {
        Row: {
          amount: number
          batch_id: string
          bic: string | null
          created_at: string
          error_flag: boolean
          error_message: string | null
          holder_name: string | null
          iban: string
          id: string
          status: string
          task_id: string
          volunteer_id: string
        }
        Insert: {
          amount: number
          batch_id: string
          bic?: string | null
          created_at?: string
          error_flag?: boolean
          error_message?: string | null
          holder_name?: string | null
          iban: string
          id?: string
          status?: string
          task_id: string
          volunteer_id: string
        }
        Update: {
          amount?: number
          batch_id?: string
          bic?: string | null
          created_at?: string
          error_flag?: boolean
          error_message?: string | null
          holder_name?: string | null
          iban?: string
          id?: string
          status?: string
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sepa_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "sepa_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_batch_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sepa_batches: {
        Row: {
          batch_message: string | null
          batch_reference: string
          club_id: string
          created_at: string
          created_by: string
          docuseal_document_url: string | null
          docuseal_submission_id: number | null
          id: string
          item_count: number
          signer_name: string | null
          status: string
          total_amount: number
          updated_at: string
          xml_content: string | null
        }
        Insert: {
          batch_message?: string | null
          batch_reference: string
          club_id: string
          created_at?: string
          created_by: string
          docuseal_document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          item_count?: number
          signer_name?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          xml_content?: string | null
        }
        Update: {
          batch_message?: string | null
          batch_reference?: string
          club_id?: string
          created_at?: string
          created_by?: string
          docuseal_document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          item_count?: number
          signer_name?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sepa_batches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_batches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_feedbacks: {
        Row: {
          club_id: string
          comment: string | null
          created_at: string
          id: string
          is_resolved: boolean
          rating: Database["public"]["Enums"]["feedback_rating"]
          task_id: string
          volunteer_id: string
        }
        Insert: {
          club_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          rating: Database["public"]["Enums"]["feedback_rating"]
          task_id: string
          volunteer_id: string
        }
        Update: {
          club_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          rating?: Database["public"]["Enums"]["feedback_rating"]
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_feedbacks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_feedbacks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_feedbacks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_feedbacks_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_feedbacks_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swaps: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          original_user_id: string
          reason: string
          replacement_user_id: string | null
          resolved_at: string | null
          status: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          original_user_id: string
          reason: string
          replacement_user_id?: string | null
          resolved_at?: string | null
          status?: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          original_user_id?: string
          reason?: string
          replacement_user_id?: string | null
          resolved_at?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_original_user_id_fkey"
            columns: ["original_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_original_user_id_fkey"
            columns: ["original_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_replacement_user_id_fkey"
            columns: ["replacement_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_replacement_user_id_fkey"
            columns: ["replacement_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_template_slots: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          location: string
          required_volunteers: number
          role_name: string
          start_offset_minutes: number
          template_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string
          required_volunteers?: number
          role_name: string
          start_offset_minutes?: number
          template_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string
          required_volunteers?: number
          role_name?: string
          start_offset_minutes?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_template_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          club_owner_id: string
          created_at: string
          document_url: string | null
          docuseal_submission_id: number | null
          id: string
          signing_url: string | null
          status: string
          task_id: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          club_owner_id: string
          created_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          signing_url?: string | null
          status?: string
          task_id: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          club_owner_id?: string
          created_at?: string
          document_url?: string | null
          docuseal_submission_id?: number | null
          id?: string
          signing_url?: string | null
          status?: string
          task_id?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      spoed_bonuses: {
        Row: {
          bonus_amount: number
          bonus_type: string
          club_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          task_id: string
        }
        Insert: {
          bonus_amount?: number
          bonus_type?: string
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          task_id: string
        }
        Update: {
          bonus_amount?: number
          bonus_type?: string
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spoed_bonuses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spoed_bonuses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spoed_bonuses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_campaigns: {
        Row: {
          campaign_type: Database["public"]["Enums"]["sponsor_campaign_type"]
          club_id: string
          coupon_validity_days: number
          cover_image_url: string | null
          created_at: string
          custom_cta: string | null
          description: string | null
          end_date: string | null
          id: string
          portal_access_token: string | null
          reward_text: string | null
          reward_value_cents: number | null
          rich_description: string | null
          sponsor_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["sponsor_campaign_status"]
          submitted_by_email: string | null
          title: string
        }
        Insert: {
          campaign_type: Database["public"]["Enums"]["sponsor_campaign_type"]
          club_id: string
          coupon_validity_days?: number
          cover_image_url?: string | null
          created_at?: string
          custom_cta?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          portal_access_token?: string | null
          reward_text?: string | null
          reward_value_cents?: number | null
          rich_description?: string | null
          sponsor_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["sponsor_campaign_status"]
          submitted_by_email?: string | null
          title: string
        }
        Update: {
          campaign_type?: Database["public"]["Enums"]["sponsor_campaign_type"]
          club_id?: string
          coupon_validity_days?: number
          cover_image_url?: string | null
          created_at?: string
          custom_cta?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          portal_access_token?: string | null
          reward_text?: string | null
          reward_value_cents?: number | null
          rich_description?: string | null
          sponsor_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["sponsor_campaign_status"]
          submitted_by_email?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_campaigns_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_campaigns_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_campaigns_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_metrics: {
        Row: {
          campaign_id: string
          claims_count: number
          date: string
          id: string
          impressions_count: number
        }
        Insert: {
          campaign_id: string
          claims_count?: number
          date?: string
          id?: string
          impressions_count?: number
        }
        Update: {
          campaign_id?: string
          claims_count?: number
          date?: string
          id?: string
          impressions_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sponsor_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          brand_color: string
          club_id: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          brand_color?: string
          club_id: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          brand_color?: string
          club_id?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
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
      task_likes: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_likes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          photo_url: string | null
          task_id: string
          volunteer_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          task_id: string
          volunteer_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          reviewer_role: string
          task_signup_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          reviewer_role: string
          task_signup_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          reviewer_role?: string
          task_signup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviews_task_signup_id_fkey"
            columns: ["task_signup_id"]
            isOneToOne: false
            referencedRelation: "task_signups"
            referencedColumns: ["id"]
          },
        ]
      }
      task_signups: {
        Row: {
          attendance_status: string
          checked_in_at: string | null
          id: string
          is_draft: boolean
          payroll_entity: string
          predicted_sub_location: string | null
          signed_up_at: string
          status: string
          task_id: string
          thankyou_sent_at: string | null
          volunteer_id: string
        }
        Insert: {
          attendance_status?: string
          checked_in_at?: string | null
          id?: string
          is_draft?: boolean
          payroll_entity?: string
          predicted_sub_location?: string | null
          signed_up_at?: string
          status?: string
          task_id: string
          thankyou_sent_at?: string | null
          volunteer_id: string
        }
        Update: {
          attendance_status?: string
          checked_in_at?: string | null
          id?: string
          is_draft?: boolean
          payroll_entity?: string
          predicted_sub_location?: string | null
          signed_up_at?: string
          status?: string
          task_id?: string
          thankyou_sent_at?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_signups_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_set_items: {
        Row: {
          created_at: string
          id: string
          set_id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          set_id: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          set_id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "task_template_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_set_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_sets: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_sets_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_sets_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          briefing_id: string | null
          club_id: string
          contract_template_category: string | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          name: string
          required_volunteers: number
          start_time: string | null
        }
        Insert: {
          briefing_id?: string | null
          club_id: string
          contract_template_category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name: string
          required_volunteers?: number
          start_time?: string | null
        }
        Update: {
          briefing_id?: string | null
          club_id?: string
          contract_template_category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name?: string
          required_volunteers?: number
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      task_waitlist: {
        Row: {
          created_at: string
          id: string
          position: number
          promoted_at: string | null
          task_id: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          promoted_at?: string | null
          task_id: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          promoted_at?: string | null
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_waitlist_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_zone_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          volunteer_id: string
          zone_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          volunteer_id: string
          zone_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          volunteer_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_zone_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "task_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      task_zones: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          max_capacity: number | null
          name: string
          parent_id: string | null
          sort_order: number
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          max_capacity?: number | null
          name: string
          parent_id?: string | null
          sort_order?: number
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          max_capacity?: number | null
          name?: string
          parent_id?: string | null
          sort_order?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_zones_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_zones_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_partner_id: string | null
          briefing_location: string | null
          briefing_time: string | null
          club_id: string
          compensation_type: string
          contract_template_id: string | null
          created_at: string
          daily_rate: number | null
          description: string | null
          end_time: string | null
          estimated_hours: number | null
          event_group_id: string | null
          event_id: string | null
          expense_amount: number | null
          expense_reimbursement: boolean
          external_ticket_class_id: string | null
          hourly_rate: number | null
          id: string
          location: string | null
          loyalty_eligible: boolean
          loyalty_points: number | null
          notes: string | null
          partner_acceptance_status: string
          partner_only: boolean
          required_training_id: string | null
          spots_available: number | null
          start_time: string | null
          status: string
          task_date: string | null
          title: string
          updated_at: string | null
          waitlist_enabled: boolean
          zone_signup_mode: string
          zone_visible_depth: number | null
        }
        Insert: {
          assigned_partner_id?: string | null
          briefing_location?: string | null
          briefing_time?: string | null
          club_id: string
          compensation_type?: string
          contract_template_id?: string | null
          created_at?: string
          daily_rate?: number | null
          description?: string | null
          end_time?: string | null
          estimated_hours?: number | null
          event_group_id?: string | null
          event_id?: string | null
          expense_amount?: number | null
          expense_reimbursement?: boolean
          external_ticket_class_id?: string | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          loyalty_eligible?: boolean
          loyalty_points?: number | null
          notes?: string | null
          partner_acceptance_status?: string
          partner_only?: boolean
          required_training_id?: string | null
          spots_available?: number | null
          start_time?: string | null
          status?: string
          task_date?: string | null
          title: string
          updated_at?: string | null
          waitlist_enabled?: boolean
          zone_signup_mode?: string
          zone_visible_depth?: number | null
        }
        Update: {
          assigned_partner_id?: string | null
          briefing_location?: string | null
          briefing_time?: string | null
          club_id?: string
          compensation_type?: string
          contract_template_id?: string | null
          created_at?: string
          daily_rate?: number | null
          description?: string | null
          end_time?: string | null
          estimated_hours?: number | null
          event_group_id?: string | null
          event_id?: string | null
          expense_amount?: number | null
          expense_reimbursement?: boolean
          external_ticket_class_id?: string | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          loyalty_eligible?: boolean
          loyalty_points?: number | null
          notes?: string | null
          partner_acceptance_status?: string
          partner_only?: boolean
          required_training_id?: string | null
          spots_available?: number | null
          start_time?: string | null
          status?: string
          task_date?: string | null
          title?: string
          updated_at?: string | null
          waitlist_enabled?: boolean
          zone_signup_mode?: string
          zone_visible_depth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_partner_id_fkey"
            columns: ["assigned_partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_group_id_fkey"
            columns: ["event_group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_required_training_id_fkey"
            columns: ["required_training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      ticketing_configs: {
        Row: {
          api_key: string
          client_secret: string | null
          club_id: string
          config_data: Json | null
          created_at: string
          event_id_external: string | null
          id: string
          is_active: boolean
          provider: Database["public"]["Enums"]["ticketing_provider"]
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string
          client_secret?: string | null
          club_id: string
          config_data?: Json | null
          created_at?: string
          event_id_external?: string | null
          id?: string
          is_active?: boolean
          provider: Database["public"]["Enums"]["ticketing_provider"]
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          client_secret?: string | null
          club_id?: string
          config_data?: Json | null
          created_at?: string
          event_id_external?: string | null
          id?: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["ticketing_provider"]
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticketing_configs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketing_configs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ticketing_logs: {
        Row: {
          action: string
          club_id: string
          created_at: string
          error_message: string | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          status: string
          volunteer_ticket_id: string | null
        }
        Insert: {
          action: string
          club_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          volunteer_ticket_id?: string | null
        }
        Update: {
          action?: string
          club_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          volunteer_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticketing_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketing_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketing_logs_volunteer_ticket_id_fkey"
            columns: ["volunteer_ticket_id"]
            isOneToOne: false
            referencedRelation: "volunteer_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          content_body: string | null
          content_type: string
          content_url: string | null
          created_at: string
          id: string
          sort_order: number
          title: string
          training_id: string
        }
        Insert: {
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          training_id: string
        }
        Update: {
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          created_at: string
          id: string
          is_practice: boolean
          module_id: string | null
          passing_score: number
          total_questions: number
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_practice?: boolean
          module_id?: string | null
          passing_score?: number
          total_questions?: number
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_practice?: boolean
          module_id?: string | null
          passing_score?: number
          total_questions?: number
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_quizzes_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean
          specific_date: string | null
          start_time: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean
          specific_date?: string | null
          start_time: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          specific_date?: string | null
          start_time?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_availability_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_availability_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_breaks: {
        Row: {
          duration_minutes: number | null
          ended_at: string | null
          id: string
          started_at: string
          task_id: string
          volunteer_id: string
        }
        Insert: {
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id: string
          volunteer_id: string
        }
        Update: {
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_breaks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_buddies: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_buddies_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_buddies_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_buddies_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_buddies_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_certificates: {
        Row: {
          certificate_design_id: string | null
          club_id: string
          created_at: string
          id: string
          issue_date: string
          pdf_url: string | null
          score: number | null
          training_id: string
          type: string
          verification_code: string | null
          volunteer_id: string
        }
        Insert: {
          certificate_design_id?: string | null
          club_id: string
          created_at?: string
          id?: string
          issue_date?: string
          pdf_url?: string | null
          score?: number | null
          training_id: string
          type?: string
          verification_code?: string | null
          volunteer_id: string
        }
        Update: {
          certificate_design_id?: string | null
          club_id?: string
          created_at?: string
          id?: string
          issue_date?: string
          pdf_url?: string | null
          score?: number | null
          training_id?: string
          type?: string
          verification_code?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_certificates_certificate_design_id_fkey"
            columns: ["certificate_design_id"]
            isOneToOne: false
            referencedRelation: "certificate_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_certificates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_certificates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_certificates_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_check_ins: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          checked_in_by: string | null
          club_id: string
          created_at: string
          id: string
          method: string
          note: string | null
          season_id: string
          task_id: string | null
          volunteer_id: string
        }
        Insert: {
          check_in_at?: string
          check_out_at?: string | null
          checked_in_by?: string | null
          club_id: string
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          season_id: string
          task_id?: string | null
          volunteer_id: string
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          checked_in_by?: string | null
          club_id?: string
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          season_id?: string
          task_id?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_check_ins_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_check_ins_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_check_ins_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_check_ins_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_club_cards: {
        Row: {
          card_uid: string
          club_id: string
          id: string
          is_digital: boolean
          linked_at: string
          user_id: string
        }
        Insert: {
          card_uid: string
          club_id: string
          id?: string
          is_digital?: boolean
          linked_at?: string
          user_id: string
        }
        Update: {
          card_uid?: string
          club_id?: string
          id?: string
          is_digital?: boolean
          linked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_club_cards_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_club_cards_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_club_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_club_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_coupons: {
        Row: {
          backup_code: string
          campaign_id: string
          created_at: string
          expires_at: string | null
          id: string
          qr_token: string
          redeemed_at: string | null
          status: string
          task_signup_id: string | null
          volunteer_id: string
        }
        Insert: {
          backup_code?: string
          campaign_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          qr_token?: string
          redeemed_at?: string | null
          status?: string
          task_signup_id?: string | null
          volunteer_id: string
        }
        Update: {
          backup_code?: string
          campaign_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          qr_token?: string
          redeemed_at?: string | null
          status?: string
          task_signup_id?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_coupons_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sponsor_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_coupons_task_signup_id_fkey"
            columns: ["task_signup_id"]
            isOneToOne: false
            referencedRelation: "task_signups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_coupons_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_coupons_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_onboarding_steps: {
        Row: {
          club_id: string
          completed_at: string | null
          created_at: string
          id: string
          skipped: boolean
          step: Database["public"]["Enums"]["onboarding_step"]
          user_id: string
        }
        Insert: {
          club_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          skipped?: boolean
          step: Database["public"]["Enums"]["onboarding_step"]
          user_id: string
        }
        Update: {
          club_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          skipped?: boolean
          step?: Database["public"]["Enums"]["onboarding_step"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_onboarding_steps_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_onboarding_steps_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_payments: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          status: string
          stripe_fee: number | null
          stripe_payment_intent_id: string | null
          stripe_receipt_url: string | null
          stripe_transfer_id: string | null
          task_id: string
          total_charged: number | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          amount?: number
          club_id: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          stripe_receipt_url?: string | null
          stripe_transfer_id?: string | null
          task_id: string
          total_charged?: number | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          stripe_receipt_url?: string | null
          stripe_transfer_id?: string | null
          task_id?: string
          total_charged?: number | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_reviews: {
        Row: {
          club_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          task_id: string
          volunteer_id: string
        }
        Insert: {
          club_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          task_id: string
          volunteer_id: string
        }
        Update: {
          club_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          task_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_reviews_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_reviews_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_rewards: {
        Row: {
          canteen_balance_eur: number
          club_id: string
          fanshop_discount_active: boolean
          free_drinks_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canteen_balance_eur?: number
          club_id: string
          fanshop_discount_active?: boolean
          free_drinks_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canteen_balance_eur?: number
          club_id?: string
          fanshop_discount_active?: boolean
          free_drinks_balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_rewards_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_rewards_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_safety_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          event_id: string
          id: string
          safety_role_id: string
          volunteer_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          safety_role_id: string
          volunteer_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          safety_role_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_safety_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_safety_roles_safety_role_id_fkey"
            columns: ["safety_role_id"]
            isOneToOne: false
            referencedRelation: "safety_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_season_usage: {
        Row: {
          billed_at: string | null
          club_id: string
          completed_tasks: number
          created_at: string
          id: string
          is_billed: boolean
          season_id: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          billed_at?: string | null
          club_id: string
          completed_tasks?: number
          created_at?: string
          id?: string
          is_billed?: boolean
          season_id: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          billed_at?: string | null
          club_id?: string
          completed_tasks?: number
          created_at?: string
          id?: string
          is_billed?: boolean
          season_id?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_season_usage_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_season_usage_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_season_usage_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_skills: {
        Row: {
          created_at: string
          id: string
          level: string
          skill_name: string
          source: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          skill_name: string
          source?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          skill_name?: string
          source?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      volunteer_tickets: {
        Row: {
          barcode: string | null
          checked_in_at: string | null
          club_id: string
          created_at: string
          error_message: string | null
          event_id: string | null
          external_ticket_id: string | null
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          task_id: string | null
          ticket_url: string | null
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          barcode?: string | null
          checked_in_at?: string | null
          club_id: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          external_ticket_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          task_id?: string | null
          ticket_url?: string | null
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          barcode?: string | null
          checked_in_at?: string | null
          club_id?: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          external_ticket_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          task_id?: string | null
          ticket_url?: string | null
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_tickets_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_tickets_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_tickets_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clubs_safe: {
        Row: {
          allow_shift_swaps: boolean | null
          created_at: string | null
          description: string | null
          id: string | null
          location: string | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          sport: string | null
        }
        Insert: {
          allow_shift_swaps?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          sport?: string | null
        }
        Update: {
          allow_shift_swaps?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          sport?: string | null
        }
        Relationships: []
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          club_onboarding_step: string | null
          compliance_blocked: boolean | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_tour_seen: boolean | null
          full_name: string | null
          id: string | null
          in_app_notifications_enabled: boolean | null
          language: string | null
          linked_partner_id: string | null
          phone: string | null
          preferences: Json | null
          primary_club_id: string | null
          public_profile: boolean | null
          push_notifications_enabled: boolean | null
          push_prompt_seen: boolean | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          club_onboarding_step?: string | null
          compliance_blocked?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_tour_seen?: boolean | null
          full_name?: string | null
          id?: string | null
          in_app_notifications_enabled?: boolean | null
          language?: string | null
          linked_partner_id?: string | null
          phone?: string | null
          preferences?: Json | null
          primary_club_id?: string | null
          public_profile?: boolean | null
          push_notifications_enabled?: boolean | null
          push_prompt_seen?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          club_onboarding_step?: string | null
          compliance_blocked?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_tour_seen?: boolean | null
          full_name?: string | null
          id?: string | null
          in_app_notifications_enabled?: boolean | null
          language?: string | null
          linked_partner_id?: string | null
          phone?: string | null
          preferences?: Json | null
          primary_club_id?: string | null
          public_profile?: boolean | null
          push_notifications_enabled?: boolean | null
          push_prompt_seen?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_partner_id_fkey"
            columns: ["linked_partner_id"]
            isOneToOne: false
            referencedRelation: "external_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_club_id_fkey"
            columns: ["primary_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_club_id_fkey"
            columns: ["primary_club_id"]
            isOneToOne: false
            referencedRelation: "clubs_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions_safe: {
        Row: {
          created_at: string | null
          id: string | null
          options: Json | null
          question_text: string | null
          quiz_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          question_text?: string | null
          quiz_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          question_text?: string | null
          quiz_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_shift_template_to_event: {
        Args: { p_event_id: string; p_template_id: string }
        Returns: number
      }
      auto_checkin_on_card_scan: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: Json
      }
      complete_partner_registration: {
        Args: { p_partner_id: string; p_user_id: string }
        Returns: Json
      }
      consume_canteen_balance: {
        Args: { p_amount?: number; p_club_id: string; p_user_id: string }
        Returns: number
      }
      consume_drink_balance: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: number
      }
      credit_canteen_balance: {
        Args: { p_amount: number; p_club_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_briefing_club_id_from_block: {
        Args: { _block_id: string }
        Returns: string
      }
      get_club_volunteer_profile: {
        Args: { p_club_id: string; p_volunteer_id: string }
        Returns: Json
      }
      get_event_live_status: { Args: { p_event_id: string }; Returns: Json }
      get_partner_club_id: { Args: { _partner_id: string }; Returns: string }
      get_partner_club_ids: { Args: { _partner_id: string }; Returns: string[] }
      get_partner_colleagues_on_task: {
        Args: { p_task_id: string; p_viewer_id: string }
        Returns: Json
      }
      get_partner_group_buddies: { Args: { p_user_id: string }; Returns: Json }
      get_pending_feedback_tasks: { Args: { p_user_id: string }; Returns: Json }
      get_public_club_info: { Args: { p_club_id: string }; Returns: Json }
      get_public_club_tasks: {
        Args: { p_club_id: string }
        Returns: {
          id: string
          status: string
          task_date: string
          title: string
        }[]
      }
      get_safe_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      get_signup_partner_id: { Args: { _access_id: string }; Returns: string }
      get_sponsor_portal_data: {
        Args: { p_campaign_id: string; p_portal_token: string }
        Returns: Json
      }
      get_volunteer_banking_info: {
        Args: { p_volunteer_id: string }
        Returns: Json
      }
      grade_quiz: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: Json
      }
      has_club_role: {
        Args: {
          _club_id: string
          _roles: Database["public"]["Enums"]["club_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_campaign_metric: {
        Args: { camp_id: string; metric_type: string }
        Returns: undefined
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_partner_admin: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_leader: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      mark_volunteer_checked_in: {
        Args: { p_signup_id: string }
        Returns: undefined
      }
      mark_volunteer_no_show: {
        Args: { p_signup_id: string }
        Returns: undefined
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
      predict_and_assign_shifts: { Args: { p_event_id: string }; Returns: Json }
      predict_volunteer_sublocation: {
        Args: { p_task_title: string; p_user_id: string }
        Returns: string
      }
      publish_event_assignments: { Args: { p_event_id: string }; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_late_statuses: { Args: { p_event_id: string }; Returns: number }
      regenerate_pos_api_key: { Args: { p_club_id: string }; Returns: string }
      rpc_consume_pos_perk: {
        Args: {
          p_card_uid: string
          p_perk_type?: string
          p_pos_api_key: string
        }
        Returns: Json
      }
      rpc_verify_pos_card: {
        Args: { p_card_uid: string; p_pos_api_key: string }
        Returns: Json
      }
      submit_shift_feedback: {
        Args: {
          p_comment?: string
          p_rating: Database["public"]["Enums"]["feedback_rating"]
          p_task_id: string
        }
        Returns: string
      }
      submit_sponsor_application: {
        Args: {
          p_brand_color?: string
          p_campaign_type?: string
          p_club_id: string
          p_contact_email?: string
          p_contact_name?: string
          p_cover_image_url?: string
          p_custom_cta?: string
          p_description?: string
          p_image_url?: string
          p_logo_url?: string
          p_reward_text?: string
          p_reward_value_cents?: number
          p_rich_description?: string
          p_sponsor_name: string
          p_task_ids?: string[]
          p_title?: string
        }
        Returns: Json
      }
      trigger_sos_replacement: { Args: { p_signup_id: string }; Returns: Json }
      validate_and_redeem_coupon: {
        Args: { p_code: string; p_portal_token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "club_owner" | "volunteer"
      club_role: "bestuurder" | "beheerder" | "medewerker"
      feedback_rating: "great" | "neutral" | "bad"
      onboarding_step:
        | "profile_complete"
        | "contract_signed"
        | "training_done"
        | "first_task"
      season_template_category:
        | "steward"
        | "bar_catering"
        | "terrain_material"
        | "admin_ticketing"
        | "event_support"
        | "custom"
      sponsor_campaign_status: "pending_payment" | "draft" | "active" | "ended"
      sponsor_campaign_type: "dashboard_banner" | "task_tag" | "local_coupon"
      ticket_status: "none" | "sent" | "checked_in"
      ticketing_provider:
        | "eventsquare"
        | "weezevent"
        | "eventbrite"
        | "ticketmaster_sport"
        | "roboticket"
        | "tymes"
        | "eventix"
        | "yourticketprovider"
        | "paylogic_seetickets"
        | "ticketmatic"
      volunteer_coupon_status: "available" | "claimed" | "redeemed"
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
      app_role: ["admin", "club_owner", "volunteer"],
      club_role: ["bestuurder", "beheerder", "medewerker"],
      feedback_rating: ["great", "neutral", "bad"],
      onboarding_step: [
        "profile_complete",
        "contract_signed",
        "training_done",
        "first_task",
      ],
      season_template_category: [
        "steward",
        "bar_catering",
        "terrain_material",
        "admin_ticketing",
        "event_support",
        "custom",
      ],
      sponsor_campaign_status: ["pending_payment", "draft", "active", "ended"],
      sponsor_campaign_type: ["dashboard_banner", "task_tag", "local_coupon"],
      ticket_status: ["none", "sent", "checked_in"],
      ticketing_provider: [
        "eventsquare",
        "weezevent",
        "eventbrite",
        "ticketmaster_sport",
        "roboticket",
        "tymes",
        "eventix",
        "yourticketprovider",
        "paylogic_seetickets",
        "ticketmatic",
      ],
      volunteer_coupon_status: ["available", "claimed", "redeemed"],
    },
  },
} as const
