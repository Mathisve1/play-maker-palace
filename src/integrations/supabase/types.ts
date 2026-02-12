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
      profiles: {
        Row: {
          avatar_url: string | null
          bank_consent_date: string | null
          bank_consent_given: boolean
          bank_consent_text: string | null
          bank_holder_name: string | null
          bank_iban: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bank_consent_date?: string | null
          bank_consent_given?: boolean
          bank_consent_text?: string | null
          bank_holder_name?: string | null
          bank_iban?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bank_consent_date?: string | null
          bank_consent_given?: boolean
          bank_consent_text?: string | null
          bank_holder_name?: string | null
          bank_iban?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          contract_template_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          expense_amount: number | null
          expense_reimbursement: boolean
          id: string
          location: string | null
          notes: string | null
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
          contract_template_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          expense_amount?: number | null
          expense_reimbursement?: boolean
          id?: string
          location?: string | null
          notes?: string | null
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
          contract_template_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          expense_amount?: number | null
          expense_reimbursement?: boolean
          id?: string
          location?: string | null
          notes?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "club_owner" | "volunteer"
      club_role: "bestuurder" | "beheerder" | "medewerker"
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
    },
  },
} as const
