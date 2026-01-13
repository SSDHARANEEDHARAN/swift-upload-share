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
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit: number | null
          rate_limit_reset_at: string | null
          request_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit?: number | null
          rate_limit_reset_at?: string | null
          request_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: number | null
          rate_limit_reset_at?: string | null
          request_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          id: string
          is_accepted: boolean | null
          joined_at: string | null
          room_id: string
          user_id: string
          username: string
        }
        Insert: {
          id?: string
          is_accepted?: boolean | null
          joined_at?: string | null
          room_id: string
          user_id: string
          username: string
        }
        Update: {
          id?: string
          is_accepted?: boolean | null
          joined_at?: string | null
          room_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_status: {
        Row: {
          id: string
          last_read_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_status_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          admin_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          name: string | null
          warning_shown_at: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          name?: string | null
          warning_shown_at?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          name?: string | null
          warning_shown_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          batch_id: string | null
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          file_size: number
          file_type: string | null
          filename: string
          id: string
          is_finalized: boolean | null
          share_token: string
          storage_path: string
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_size: number
          file_type?: string | null
          filename: string
          id?: string
          is_finalized?: boolean | null
          share_token?: string
          storage_path: string
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_size?: number
          file_type?: string | null
          filename?: string
          id?: string
          is_finalized?: boolean | null
          share_token?: string
          storage_path?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          share_token: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          share_token?: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          share_token?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_notes_revisions: {
        Row: {
          content: string
          created_at: string
          id: string
          note_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_revisions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "shared_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_files_by_share_token: {
        Args: { p_share_token: string }
        Returns: {
          batch_id: string | null
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          file_size: number
          file_type: string | null
          filename: string
          id: string
          is_finalized: boolean | null
          share_token: string
          storage_path: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "files"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_online_user_ids: { Args: never; Returns: string[] }
      get_profile_public_info: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          is_online: boolean
        }[]
      }
      get_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          room_id: string
          unread_count: number
        }[]
      }
      get_user_room_ids: { Args: { _user_id: string }; Returns: string[] }
      increment_download_count: {
        Args: { file_id: string }
        Returns: undefined
      }
      is_room_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      search_users_safe: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          is_online: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
