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
      game_rounds: {
        Row: {
          created_at: string
          game_id: string
          id: string
          pot_amount: number
          round_number: number
          was_tie: boolean
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          pot_amount: number
          round_number: number
          was_tie?: boolean
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          pot_amount?: number
          round_number?: number
          was_tie?: boolean
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          bet_amount: number
          created_at: string
          current_player_id: string | null
          host_name: string
          id: string
          pot: number
          room_code: string
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
        }
        Insert: {
          bet_amount?: number
          created_at?: string
          current_player_id?: string | null
          host_name: string
          id?: string
          pot?: number
          room_code: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          current_player_id?: string | null
          host_name?: string
          id?: string
          pot?: number
          room_code?: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
        }
        Relationships: []
      }
      player_accounts: {
        Row: {
          created_at: string
          failed_reset_attempts: number
          id: string
          is_locked: boolean
          name: string
          pin_hash: string | null
          security_color: string | null
        }
        Insert: {
          created_at?: string
          failed_reset_attempts?: number
          id?: string
          is_locked?: boolean
          name: string
          pin_hash?: string | null
          security_color?: string | null
        }
        Update: {
          created_at?: string
          failed_reset_attempts?: number
          id?: string
          is_locked?: boolean
          name?: string
          pin_hash?: string | null
          security_color?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          account_id: string | null
          created_at: string
          current_score: number | null
          game_id: string
          id: string
          is_active: boolean
          kept_dice: number[] | null
          name: string
          roll_off_value: number | null
          rolls_remaining: number | null
          session_id: string
          status: Database["public"]["Enums"]["player_status"]
          total_earnings: number
          turn_order: number | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          current_score?: number | null
          game_id: string
          id?: string
          is_active?: boolean
          kept_dice?: number[] | null
          name: string
          roll_off_value?: number | null
          rolls_remaining?: number | null
          session_id: string
          status?: Database["public"]["Enums"]["player_status"]
          total_earnings?: number
          turn_order?: number | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          current_score?: number | null
          game_id?: string
          id?: string
          is_active?: boolean
          kept_dice?: number[] | null
          name?: string
          roll_off_value?: number | null
          rolls_remaining?: number | null
          session_id?: string
          status?: Database["public"]["Enums"]["player_status"]
          total_earnings?: number
          turn_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "player_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      players_public: {
        Row: {
          created_at: string | null
          current_score: number | null
          game_id: string | null
          id: string | null
          is_active: boolean | null
          kept_dice: number[] | null
          name: string | null
          roll_off_value: number | null
          rolls_remaining: number | null
          status: Database["public"]["Enums"]["player_status"] | null
          total_earnings: number | null
          turn_order: number | null
        }
        Insert: {
          created_at?: string | null
          current_score?: number | null
          game_id?: string | null
          id?: string | null
          is_active?: boolean | null
          kept_dice?: number[] | null
          name?: string | null
          roll_off_value?: number | null
          rolls_remaining?: number | null
          status?: Database["public"]["Enums"]["player_status"] | null
          total_earnings?: number | null
          turn_order?: number | null
        }
        Update: {
          created_at?: string | null
          current_score?: number | null
          game_id?: string | null
          id?: string | null
          is_active?: boolean | null
          kept_dice?: number[] | null
          name?: string | null
          roll_off_value?: number | null
          rolls_remaining?: number | null
          status?: Database["public"]["Enums"]["player_status"] | null
          total_earnings?: number | null
          turn_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_status:
        | "waiting"
        | "roll_off"
        | "playing"
        | "tie_breaker"
        | "finished"
        | "between_rounds"
      player_status: "waiting" | "rolling" | "finished"
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
      game_status: [
        "waiting",
        "roll_off",
        "playing",
        "tie_breaker",
        "finished",
        "between_rounds",
      ],
      player_status: ["waiting", "rolling", "finished"],
    },
  },
} as const
