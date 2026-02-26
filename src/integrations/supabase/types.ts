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
          block_id: string
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
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
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          task_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
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
            foreignKeyName: "briefings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          owner_id: string
          sport: string | null
          stripe_account_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          sport?: string | null
          stripe_account_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          sport?: string | null
          stripe_account_id?: string | null
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
      event_groups: {
        Row: {
          color: string
          created_at: string
          event_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          event_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          sort_order?: number
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
      events: {
        Row: {
          certificate_design_id: string | null
          club_id: string
          created_at: string
          description: string | null
          event_date: string | null
          event_type: string
          external_event_id: string | null
          id: string
          location: string | null
          status: string
          title: string
          training_id: string | null
          updated_at: string
        }
        Insert: {
          certificate_design_id?: string | null
          club_id: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          location?: string | null
          status?: string
          title: string
          training_id?: string | null
          updated_at?: string
        }
        Update: {
          certificate_design_id?: string | null
          club_id?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          external_event_id?: string | null
          id?: string
          location?: string | null
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
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
        ]
      }
      hour_confirmations: {
        Row: {
          club_approved: boolean
          club_reported_hours: number | null
          created_at: string
          final_amount: number | null
          final_hours: number | null
          id: string
          status: string
          task_id: string
          updated_at: string
          volunteer_approved: boolean
          volunteer_id: string
          volunteer_reported_hours: number | null
        }
        Insert: {
          club_approved?: boolean
          club_reported_hours?: number | null
          created_at?: string
          final_amount?: number | null
          final_hours?: number | null
          id?: string
          status?: string
          task_id: string
          updated_at?: string
          volunteer_approved?: boolean
          volunteer_id: string
          volunteer_reported_hours?: number | null
        }
        Update: {
          club_approved?: boolean
          club_reported_hours?: number | null
          created_at?: string
          final_amount?: number | null
          final_hours?: number | null
          id?: string
          status?: string
          task_id?: string
          updated_at?: string
          volunteer_approved?: boolean
          volunteer_id?: string
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
      notifications: {
        Row: {
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
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          partner_id: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          partner_id: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          partner_id?: string
          phone?: string | null
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
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          onesignal_player_id: string | null
          phone: string | null
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
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onesignal_player_id?: string | null
          phone?: string | null
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
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onesignal_player_id?: string | null
          phone?: string | null
          stripe_account_id?: string | null
          updated_at?: string
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
      task_signups: {
        Row: {
          id: string
          signed_up_at: string
          status: string
          task_id: string
          volunteer_id: string
        }
        Insert: {
          id?: string
          signed_up_at?: string
          status?: string
          task_id: string
          volunteer_id: string
        }
        Update: {
          id?: string
          signed_up_at?: string
          status?: string
          task_id?: string
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
      tasks: {
        Row: {
          briefing_location: string | null
          briefing_time: string | null
          club_id: string
          compensation_type: string
          contract_template_id: string | null
          created_at: string
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
          required_training_id: string | null
          spots_available: number | null
          start_time: string | null
          status: string
          task_date: string | null
          title: string
        }
        Insert: {
          briefing_location?: string | null
          briefing_time?: string | null
          club_id: string
          compensation_type?: string
          contract_template_id?: string | null
          created_at?: string
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
          required_training_id?: string | null
          spots_available?: number | null
          start_time?: string | null
          status?: string
          task_date?: string | null
          title: string
        }
        Update: {
          briefing_location?: string | null
          briefing_time?: string | null
          club_id?: string
          compensation_type?: string
          contract_template_id?: string | null
          created_at?: string
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
          required_training_id?: string | null
          spots_available?: number | null
          start_time?: string | null
          status?: string
          task_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
            foreignKeyName: "volunteer_certificates_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "academy_trainings"
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
            foreignKeyName: "volunteer_payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      get_partner_club_id: { Args: { _partner_id: string }; Returns: string }
      get_signup_partner_id: { Args: { _access_id: string }; Returns: string }
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
      is_partner_admin: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "club_owner" | "volunteer"
      club_role: "bestuurder" | "beheerder" | "medewerker"
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
    },
  },
} as const
