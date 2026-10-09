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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      breeding_records: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["breeding_type"]
          id: string
          lambs_alive: number | null
          lambs_born: number | null
          notes: string | null
          ram_tag: string | null
          recorded_on: string
          sheep_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["breeding_type"]
          id?: string
          lambs_alive?: number | null
          lambs_born?: number | null
          notes?: string | null
          ram_tag?: string | null
          recorded_on?: string
          sheep_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["breeding_type"]
          id?: string
          lambs_alive?: number | null
          lambs_born?: number | null
          notes?: string | null
          ram_tag?: string | null
          recorded_on?: string
          sheep_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_sheep_id_fkey"
            columns: ["sheep_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
      death_records: {
        Row: {
          cause: Database["public"]["Enums"]["death_cause"]
          created_at: string
          details: string | null
          died_on: string
          id: string
          notes: string | null
          sheep_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cause?: Database["public"]["Enums"]["death_cause"]
          created_at?: string
          details?: string | null
          died_on?: string
          id?: string
          notes?: string | null
          sheep_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cause?: Database["public"]["Enums"]["death_cause"]
          created_at?: string
          details?: string | null
          died_on?: string
          id?: string
          notes?: string | null
          sheep_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "death_records_sheep_id_fkey"
            columns: ["sheep_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
      grazing_records: {
        Row: {
          created_at: string
          herd_id: string
          id: string
          moved_in_on: string
          moved_out_on: string | null
          notes: string | null
          paddock: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          herd_id: string
          id?: string
          moved_in_on?: string
          moved_out_on?: string | null
          notes?: string | null
          paddock: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          herd_id?: string
          id?: string
          moved_in_on?: string
          moved_out_on?: string | null
          notes?: string | null
          paddock?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grazing_records_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
        ]
      }
      grazing_reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          due_on: string
          herd_id: string
          id: string
          notes: string | null
          target_paddock: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_on: string
          herd_id: string
          id?: string
          notes?: string | null
          target_paddock?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_on?: string
          herd_id?: string
          id?: string
          notes?: string | null
          target_paddock?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grazing_reminders_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          created_at: string
          dose: string | null
          event_type: Database["public"]["Enums"]["health_type"]
          id: string
          notes: string | null
          product: string | null
          recorded_on: string
          sheep_id: string
          user_id: string
          withdrawal_until: string | null
        }
        Insert: {
          created_at?: string
          dose?: string | null
          event_type?: Database["public"]["Enums"]["health_type"]
          id?: string
          notes?: string | null
          product?: string | null
          recorded_on?: string
          sheep_id: string
          user_id: string
          withdrawal_until?: string | null
        }
        Update: {
          created_at?: string
          dose?: string | null
          event_type?: Database["public"]["Enums"]["health_type"]
          id?: string
          notes?: string | null
          product?: string | null
          recorded_on?: string
          sheep_id?: string
          user_id?: string
          withdrawal_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_sheep_id_fkey"
            columns: ["sheep_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
      herds: {
        Row: {
          colour: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          farm_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          farm_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          farm_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string
          due_on: string
          id: string
          notes: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sheep_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_on: string
          id?: string
          notes?: string | null
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sheep_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_on?: string
          id?: string
          notes?: string | null
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sheep_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_sheep_id_fkey"
            columns: ["sheep_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_records: {
        Row: {
          buyer: string | null
          created_at: string
          id: string
          notes: string | null
          price: number | null
          sale_type: Database["public"]["Enums"]["sale_type"]
          sheep_id: string
          sold_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price?: number | null
          sale_type?: Database["public"]["Enums"]["sale_type"]
          sheep_id: string
          sold_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price?: number | null
          sale_type?: Database["public"]["Enums"]["sale_type"]
          sheep_id?: string
          sold_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_records_sheep_id_fkey"
            columns: ["sheep_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
      sheep: {
        Row: {
          birth_date: string | null
          breed: string | null
          colour: string | null
          created_at: string
          dam_id: string | null
          herd_id: string | null
          id: string
          name: string | null
          notes: string | null
          sex: Database["public"]["Enums"]["sheep_sex"]
          sire_id: string | null
          status: Database["public"]["Enums"]["sheep_status"]
          tag_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          colour?: string | null
          created_at?: string
          dam_id?: string | null
          herd_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          sex?: Database["public"]["Enums"]["sheep_sex"]
          sire_id?: string | null
          status?: Database["public"]["Enums"]["sheep_status"]
          tag_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          colour?: string | null
          created_at?: string
          dam_id?: string | null
          herd_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          sex?: Database["public"]["Enums"]["sheep_sex"]
          sire_id?: string | null
          status?: Database["public"]["Enums"]["sheep_status"]
          tag_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheep_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheep_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheep_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_records: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          recorded_on: string
          sheep_id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          recorded_on?: string
          sheep_id: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          recorded_on?: string
          sheep_id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_records_sheep_id_fkey"
            columns: ["sheep_id"]
            isOneToOne: false
            referencedRelation: "sheep"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      breeding_type: "mating" | "scan" | "lambing"
      death_cause:
        | "illness"
        | "predation"
        | "accident"
        | "lambing"
        | "age"
        | "unknown"
        | "other"
      health_type:
        | "vaccination"
        | "drench"
        | "treatment"
        | "illness"
        | "shearing"
        | "other"
      reminder_type: "vaccination" | "deworming" | "checkup" | "other"
      sale_type: "private" | "auction" | "abattoir" | "breeding_stock" | "other"
      sheep_sex: "ewe" | "ram" | "wether"
      sheep_status: "active" | "sold" | "deceased" | "culled"
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
      breeding_type: ["mating", "scan", "lambing"],
      death_cause: [
        "illness",
        "predation",
        "accident",
        "lambing",
        "age",
        "unknown",
        "other",
      ],
      health_type: [
        "vaccination",
        "drench",
        "treatment",
        "illness",
        "shearing",
        "other",
      ],
      reminder_type: ["vaccination", "deworming", "checkup", "other"],
      sale_type: ["private", "auction", "abattoir", "breeding_stock", "other"],
      sheep_sex: ["ewe", "ram", "wether"],
      sheep_status: ["active", "sold", "deceased", "culled"],
    },
  },
} as const
