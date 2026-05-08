export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      admin_invite_rate_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'admin_invite_rate_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      auth_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target_email: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_email?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'auth_audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          publish_date: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          publish_date?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          publish_date?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cart_items_cart_id_fkey'
            columns: ['cart_id']
            isOneToOne: false
            referencedRelation: 'carts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cart_items_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'carts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_message_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_message_attachments_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'chat_messages'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          message_type: Database['public']['Enums']['chat_message_type']
          room_id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_type?: Database['public']['Enums']['chat_message_type']
          room_id: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_type?: Database['public']['Enums']['chat_message_type']
          room_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'chat_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_room_participants: {
        Row: {
          added_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_room_participants_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'chat_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_room_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_room_reads: {
        Row: {
          last_read_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_room_reads_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'chat_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_room_reads_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database['public']['Enums']['chat_room_kind']
          order_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database['public']['Enums']['chat_room_kind']
          order_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database['public']['Enums']['chat_room_kind']
          order_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_rooms_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_rooms_order_id_fkey'
            columns: ['order_id']
            isOneToOne: true
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      change_requests: {
        Row: {
          comment: string
          created_at: string
          id: string
          order_id: string
          status: Database['public']['Enums']['change_request_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          order_id: string
          status?: Database['public']['Enums']['change_request_status']
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          order_id?: string
          status?: Database['public']['Enums']['change_request_status']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'change_requests_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'change_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      error_logs: {
        Row: {
          context: string | null
          created_at: string
          id: number
          level: string
          message: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: number
          level?: string
          message: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: number
          level?: string
          message?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'error_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          order_id: string
          paid_at: string | null
          sent_at: string | null
          status: Database['public']['Enums']['invoice_status']
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          sent_at?: string | null
          status?: Database['public']['Enums']['invoice_status']
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          sent_at?: string | null
          status?: Database['public']['Enums']['invoice_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_order_id_fkey'
            columns: ['order_id']
            isOneToOne: true
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_content_versions: {
        Row: {
          body_html: string
          copywriter_id: string
          created_at: string
          id: string
          meta_description: string
          order_id: string
          status: Database['public']['Enums']['order_content_status']
          title: string
          updated_at: string
          version_number: number | null
          word_count: number
        }
        Insert: {
          body_html?: string
          copywriter_id: string
          created_at?: string
          id?: string
          meta_description?: string
          order_id: string
          status: Database['public']['Enums']['order_content_status']
          title?: string
          updated_at?: string
          version_number?: number | null
          word_count?: number
        }
        Update: {
          body_html?: string
          copywriter_id?: string
          created_at?: string
          id?: string
          meta_description?: string
          order_id?: string
          status?: Database['public']['Enums']['order_content_status']
          title?: string
          updated_at?: string
          version_number?: number | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_content_versions_copywriter_id_fkey'
            columns: ['copywriter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_content_versions_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          copywriter_id: string | null
          created_at: string
          id: string
          price: number
          publish_date: string | null
          published_url: string | null
          site_category: string
          site_contact_info: string | null
          site_countries: string[]
          site_description: string | null
          site_domain: string
          site_dr: number | null
          site_id: string | null
          site_keywords_relevance: string | null
          site_languages: string[]
          site_link_type: Database['public']['Enums']['link_type']
          site_organic_keywords_count: number | null
          site_organic_traffic_count: number | null
          site_requirements: string | null
          status: Database['public']['Enums']['order_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          copywriter_id?: string | null
          created_at?: string
          id?: string
          price: number
          publish_date?: string | null
          published_url?: string | null
          site_category: string
          site_contact_info?: string | null
          site_countries?: string[]
          site_description?: string | null
          site_domain: string
          site_dr?: number | null
          site_id?: string | null
          site_keywords_relevance?: string | null
          site_languages?: string[]
          site_link_type: Database['public']['Enums']['link_type']
          site_organic_keywords_count?: number | null
          site_organic_traffic_count?: number | null
          site_requirements?: string | null
          status?: Database['public']['Enums']['order_status']
          updated_at?: string
          user_id: string
        }
        Update: {
          copywriter_id?: string | null
          created_at?: string
          id?: string
          price?: number
          publish_date?: string | null
          published_url?: string | null
          site_category?: string
          site_contact_info?: string | null
          site_countries?: string[]
          site_description?: string | null
          site_domain?: string
          site_dr?: number | null
          site_id?: string | null
          site_keywords_relevance?: string | null
          site_languages?: string[]
          site_link_type?: Database['public']['Enums']['link_type']
          site_organic_keywords_count?: number | null
          site_organic_traffic_count?: number | null
          site_requirements?: string | null
          status?: Database['public']['Enums']['order_status']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_copywriter_id_fkey'
            columns: ['copywriter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          require_password_change: boolean
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          require_password_change?: boolean
          role: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          require_password_change?: boolean
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      public_rate_limit_events: {
        Row: {
          created_at: string
          id: string
          key: string
          kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          kind: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          kind?: string
        }
        Relationships: []
      }
      site_countries: {
        Row: {
          country: string
          site_id: string
        }
        Insert: {
          country: string
          site_id: string
        }
        Update: {
          country?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'site_countries_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
        ]
      }
      site_languages: {
        Row: {
          language: string
          site_id: string
        }
        Insert: {
          language: string
          site_id: string
        }
        Update: {
          language?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'site_languages_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
        ]
      }
      sites: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: number
          contact_info: string | null
          created_at: string
          description: string | null
          domain: string
          dr: number
          id: string
          keywords_relevance: string | null
          link_type: Database['public']['Enums']['link_type']
          needs_changes_at: string | null
          needs_changes_by: string | null
          organic_keywords_count: number | null
          organic_traffic_count: number | null
          price: number
          requirements: string | null
          sourcer_id: string | null
          sourcer_notes: string | null
          status: Database['public']['Enums']['site_status']
          top_countries: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id: number
          contact_info?: string | null
          created_at?: string
          description?: string | null
          domain: string
          dr: number
          id?: string
          keywords_relevance?: string | null
          link_type?: Database['public']['Enums']['link_type']
          needs_changes_at?: string | null
          needs_changes_by?: string | null
          organic_keywords_count?: number | null
          organic_traffic_count?: number | null
          price: number
          requirements?: string | null
          sourcer_id?: string | null
          sourcer_notes?: string | null
          status?: Database['public']['Enums']['site_status']
          top_countries?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: number
          contact_info?: string | null
          created_at?: string
          description?: string | null
          domain?: string
          dr?: number
          id?: string
          keywords_relevance?: string | null
          link_type?: Database['public']['Enums']['link_type']
          needs_changes_at?: string | null
          needs_changes_by?: string | null
          organic_keywords_count?: number | null
          organic_traffic_count?: number | null
          price?: number
          requirements?: string | null
          sourcer_id?: string | null
          sourcer_notes?: string | null
          status?: Database['public']['Enums']['site_status']
          top_countries?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sites_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sites_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sites_needs_changes_by_fkey'
            columns: ['needs_changes_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sites_sourcer_id_fkey'
            columns: ['sourcer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_email_exists: { Args: { p_email: string }; Returns: boolean }
      bootstrap_signup_allowed: { Args: never; Returns: boolean }
      get_my_role: {
        Args: never
        Returns: Database['public']['Enums']['user_role']
      }
      is_chat_participant: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      replace_site_countries_and_languages: {
        Args: {
          p_countries: string[]
          p_languages: string[]
          p_site_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      change_request_status: 'open' | 'resolved' | 'dismissed'
      chat_message_type: 'text' | 'system'
      chat_room_kind: 'order' | 'direct' | 'group'
      invoice_status: 'pending' | 'paid' | 'overdue' | 'canceled'
      link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc'
      order_content_status: 'draft' | 'submitted'
      order_status:
        | 'new'
        | 'in_progress'
        | 'content_sent'
        | 'needs_changes'
        | 'content_approved'
        | 'published'
        | 'completed'
        | 'canceled'
      site_status: 'active' | 'inactive' | 'pending' | 'needs_changes' | 'approved' | 'archived'
      user_role: 'client' | 'admin' | 'sourcer' | 'manager' | 'copywriter'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      change_request_status: ['open', 'resolved', 'dismissed'],
      chat_message_type: ['text', 'system'],
      chat_room_kind: ['order', 'direct', 'group'],
      invoice_status: ['pending', 'paid', 'overdue', 'canceled'],
      link_type: ['dofollow', 'nofollow', 'sponsored', 'ugc'],
      order_content_status: ['draft', 'submitted'],
      order_status: [
        'new',
        'in_progress',
        'content_sent',
        'needs_changes',
        'content_approved',
        'published',
        'completed',
        'canceled',
      ],
      site_status: ['active', 'inactive', 'pending', 'needs_changes', 'approved', 'archived'],
      user_role: ['client', 'admin', 'sourcer', 'manager', 'copywriter'],
    },
  },
} as const
