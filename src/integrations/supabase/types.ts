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
      ad_impressions: {
        Row: {
          article_id: string | null
          created_at: string
          estimated_revenue_brl: number
          event_type: Database["public"]["Enums"]["ad_event_type"]
          id: string
          slot: string
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          estimated_revenue_brl?: number
          event_type?: Database["public"]["Enums"]["ad_event_type"]
          id?: string
          slot: string
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string
          estimated_revenue_brl?: number
          event_type?: Database["public"]["Enums"]["ad_event_type"]
          id?: string
          slot?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_comments: {
        Row: {
          article_id: string
          content: string
          created_at: string
          flag_reason: string | null
          id: string
          status: Database["public"]["Enums"]["comment_status"]
          user_id: string
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["comment_status"]
          user_id: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["comment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_saves: {
        Row: {
          article_id: string | null
          created_at: string
          external_image: string | null
          external_source: string | null
          external_title: string | null
          external_url: string | null
          id: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          external_image?: string | null
          external_source?: string | null
          external_title?: string | null
          external_url?: string | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          external_image?: string | null
          external_source?: string | null
          external_title?: string | null
          external_url?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_saves_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_views: {
        Row: {
          article_id: string | null
          country: string | null
          created_at: string
          external_url: string | null
          id: string
          referrer: string | null
          session_hash: string | null
          viewer_id: string | null
        }
        Insert: {
          article_id?: string | null
          country?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          referrer?: string | null
          session_hash?: string | null
          viewer_id?: string | null
        }
        Update: {
          article_id?: string | null
          country?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          referrer?: string | null
          session_hash?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["article_category"]
          comments_count: number
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          likes_count: number
          published_at: string | null
          read_minutes: number | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id: string
          category?: Database["public"]["Enums"]["article_category"]
          comments_count?: number
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          likes_count?: number
          published_at?: string | null
          read_minutes?: number | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["article_category"]
          comments_count?: number
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          likes_count?: number
          published_at?: string | null
          read_minutes?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      category_follows: {
        Row: {
          category: Database["public"]["Enums"]["article_category"]
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["article_category"]
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["article_category"]
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_brl: number
          created_at: string
          description: string | null
          gateway_provider: string | null
          gateway_status: string | null
          gateway_tx_id: string | null
          id: string
          pix_copy_paste: string | null
          pix_key: string | null
          pix_qrcode: string | null
          reference_id: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_brl: number
          created_at?: string
          description?: string | null
          gateway_provider?: string | null
          gateway_status?: string | null
          gateway_tx_id?: string | null
          id?: string
          pix_copy_paste?: string | null
          pix_key?: string | null
          pix_qrcode?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          created_at?: string
          description?: string | null
          gateway_provider?: string | null
          gateway_status?: string | null
          gateway_tx_id?: string | null
          id?: string
          pix_copy_paste?: string | null
          pix_key?: string | null
          pix_qrcode?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ad_event_type: "impression" | "click"
      app_role: "admin" | "moderator" | "user"
      article_category:
        | "ia"
        | "tecnologia"
        | "games"
        | "futebol"
        | "negocios"
        | "cripto"
        | "viral"
      article_status: "draft" | "published" | "archived"
      comment_status: "pending" | "approved" | "rejected"
      wallet_tx_status: "pending" | "confirmed" | "paid" | "rejected"
      wallet_tx_type:
        | "credit_views"
        | "credit_ads"
        | "credit_sponsor"
        | "payout_pix"
        | "adjustment"
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
      ad_event_type: ["impression", "click"],
      app_role: ["admin", "moderator", "user"],
      article_category: [
        "ia",
        "tecnologia",
        "games",
        "futebol",
        "negocios",
        "cripto",
        "viral",
      ],
      article_status: ["draft", "published", "archived"],
      comment_status: ["pending", "approved", "rejected"],
      wallet_tx_status: ["pending", "confirmed", "paid", "rejected"],
      wallet_tx_type: [
        "credit_views",
        "credit_ads",
        "credit_sponsor",
        "payout_pix",
        "adjustment",
      ],
    },
  },
} as const
