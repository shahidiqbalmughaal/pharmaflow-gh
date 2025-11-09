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
      alert_history: {
        Row: {
          alert_type: string
          batch_no: string | null
          created_at: string
          current_quantity: number | null
          expiry_date: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          notification_method: string
          sent_at: string
          sent_to: string
        }
        Insert: {
          alert_type: string
          batch_no?: string | null
          created_at?: string
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          notification_method: string
          sent_at?: string
          sent_to: string
        }
        Update: {
          alert_type?: string
          batch_no?: string | null
          created_at?: string
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          notification_method?: string
          sent_at?: string
          sent_to?: string
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          admin_emails: string[]
          admin_whatsapp_numbers: string[]
          check_frequency_hours: number
          created_at: string
          email_enabled: boolean
          expiry_warning_days: number
          id: string
          low_stock_threshold: number
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          admin_emails?: string[]
          admin_whatsapp_numbers?: string[]
          check_frequency_hours?: number
          created_at?: string
          email_enabled?: boolean
          expiry_warning_days?: number
          id?: string
          low_stock_threshold?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          admin_emails?: string[]
          admin_whatsapp_numbers?: string[]
          check_frequency_hours?: number
          created_at?: string
          email_enabled?: boolean
          expiry_warning_days?: number
          id?: string
          low_stock_threshold?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          api_base_url: string
          api_key: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          api_base_url: string
          api_key: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          api_base_url?: string
          api_key?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cosmetics: {
        Row: {
          batch_no: string
          brand: string
          created_at: string | null
          expiry_date: string
          id: string
          manufacturing_date: string
          product_name: string
          purchase_price: number
          quantity: number
          rack_no: string
          selling_price: number
          supplier: string
          updated_at: string | null
        }
        Insert: {
          batch_no: string
          brand: string
          created_at?: string | null
          expiry_date: string
          id?: string
          manufacturing_date: string
          product_name: string
          purchase_price: number
          quantity?: number
          rack_no: string
          selling_price: number
          supplier: string
          updated_at?: string | null
        }
        Update: {
          batch_no?: string
          brand?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          manufacturing_date?: string
          product_name?: string
          purchase_price?: number
          quantity?: number
          rack_no?: string
          selling_price?: number
          supplier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_discounts: {
        Row: {
          created_at: string
          customer_id: string
          discount_percentage: number
          id: string
          is_active: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_discounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string
          total_purchases: number
          total_spent: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone: string
          total_purchases?: number
          total_spent?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string
          total_purchases?: number
          total_spent?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      medicines: {
        Row: {
          batch_no: string
          company_name: string
          created_at: string | null
          expiry_date: string
          id: string
          manufacturing_date: string
          medicine_name: string
          price_per_packet: number | null
          purchase_price: number
          quantity: number
          rack_no: string
          selling_price: number
          selling_type: string
          supplier: string
          tablets_per_packet: number | null
          updated_at: string | null
        }
        Insert: {
          batch_no: string
          company_name: string
          created_at?: string | null
          expiry_date: string
          id?: string
          manufacturing_date: string
          medicine_name: string
          price_per_packet?: number | null
          purchase_price: number
          quantity?: number
          rack_no: string
          selling_price: number
          selling_type?: string
          supplier: string
          tablets_per_packet?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_no?: string
          company_name?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          manufacturing_date?: string
          medicine_name?: string
          price_per_packet?: number | null
          purchase_price?: number
          quantity?: number
          rack_no?: string
          selling_price?: number
          selling_type?: string
          supplier?: string
          tablets_per_packet?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          batch_no: string | null
          created_at: string | null
          current_stock: number
          id: string
          item_id: string
          item_name: string
          item_type: string
          order_quantity: number
          purchase_order_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string | null
          current_stock?: number
          id?: string
          item_id: string
          item_name: string
          item_type: string
          order_quantity: number
          purchase_order_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string | null
          current_stock?: number
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          order_quantity?: number
          purchase_order_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          order_number: string
          sent_at: string | null
          status: string
          supplier_id: string
          supplier_name: string
          total_amount: number
          total_items: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number: string
          sent_at?: string | null
          status?: string
          supplier_id: string
          supplier_name: string
          total_amount?: number
          total_items?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          sent_at?: string | null
          status?: string
          supplier_id?: string
          supplier_name?: string
          total_amount?: number
          total_items?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          batch_no: string
          created_at: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          profit: number
          quantity: number
          sale_id: string
          tablets_per_packet: number | null
          total_packets: number | null
          total_price: number
          total_tablets: number | null
          unit_price: number
        }
        Insert: {
          batch_no: string
          created_at?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          profit: number
          quantity: number
          sale_id: string
          tablets_per_packet?: number | null
          total_packets?: number | null
          total_price: number
          total_tablets?: number | null
          unit_price: number
        }
        Update: {
          batch_no?: string
          created_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          profit?: number
          quantity?: number
          sale_id?: string
          tablets_per_packet?: number | null
          total_packets?: number | null
          total_price?: number
          total_tablets?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          discount_percentage: number | null
          id: string
          loyalty_points_earned: number | null
          loyalty_points_redeemed: number | null
          sale_date: string | null
          salesman_id: string | null
          salesman_name: string
          subtotal: number
          tax: number | null
          total_amount: number
          total_profit: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          discount_percentage?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_redeemed?: number | null
          sale_date?: string | null
          salesman_id?: string | null
          salesman_name: string
          subtotal: number
          tax?: number | null
          total_amount: number
          total_profit: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          discount_percentage?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_redeemed?: number | null
          sale_date?: string | null
          salesman_id?: string | null
          salesman_name?: string
          subtotal?: number
          tax?: number | null
          total_amount?: number
          total_profit?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
        ]
      }
      salesmen: {
        Row: {
          assigned_counter: string
          cnic: string
          contact: string
          created_at: string | null
          id: string
          joining_date: string
          name: string
        }
        Insert: {
          assigned_counter: string
          cnic: string
          contact: string
          created_at?: string | null
          id?: string
          joining_date: string
          name: string
        }
        Update: {
          assigned_counter?: string
          cnic?: string
          contact?: string
          created_at?: string | null
          id?: string
          joining_date?: string
          name?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_cosmetic_quantity: {
        Args: { cosmetic_id: string; qty: number }
        Returns: undefined
      }
      decrement_medicine_quantity: {
        Args: { medicine_id: string; qty: number }
        Returns: undefined
      }
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "salesman"
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
      app_role: ["admin", "manager", "salesman"],
    },
  },
} as const
